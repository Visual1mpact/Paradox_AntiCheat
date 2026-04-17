import { world, system, ItemTypes } from "@minecraft/server";

// ------------------- CONFIG -------------------

/** Object used as a key for cooldown tracking in WeakMap */
const object = { cooldown: "String" };

/** WeakMap to track cooldowns for lag clear operations */
const cooldownTimer = new WeakMap<typeof object, number>();

/** Job ID for the currently running lag clear generator */
let lagClearJobId: number | null = null;

/** Interval ID for the periodic lag clear runner */
let lagClearRunId: number | null = null;

/** Tick at which the next lag clear should execute */
let globalEndTick: number | null = null;

/** Index of the last countdown message sent */
let lastMessageIndex = -1;

/** Set of entity type IDs exempt from mass removal */
const entityException = new Set([
    "minecraft:ender_dragon",
    "minecraft:wither",
    "minecraft:elder_guardian",
    "minecraft:evocation_illager",
    "minecraft:illusion_illager",
    "minecraft:vindicator",
    "minecraft:pillager",
    "minecraft:ravager",
    "minecraft:shulker",
    "minecraft:warden",
    "minecraft:creaking",
    "minecraft:happy_ghast",
    "minecraft:ghastling",
]);

/** Seconds at which to announce countdown messages */
const messageIntervals = [60, 5, 4, 3, 2, 1];

// ------------------- UTIL -------------------

/**
 * Converts hours, minutes, and seconds into Minecraft ticks.
 * @param {number} h - Hours
 * @param {number} m - Minutes
 * @param {number} s - Seconds
 * @returns {number} Total ticks
 */
function timeToTicks(h: number, m: number, s: number): number {
    return h * 72000 + m * 1200 + s * 20;
}

// ------------------- LAG CLEAR -------------------

/**
 * Generator that handles a single tick of countdown and clearing.
 * Sends countdown messages and clears entities/items when time expires.
 * @param {number} endTick - Tick at which lag clear should execute
 */
function* lagClearGenerator(endTick: number): Generator<void, void, unknown> {
    const currentTick = system.currentTick;
    const ticksLeft = endTick - currentTick;

    if (ticksLeft <= 0) {
        clearEntityItems();
        clearEntities();
        world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag has been cleared!`);

        cooldownTimer.set(object, currentTick);

        globalEndTick = null;
        lastMessageIndex = -1;
        return;
    }

    const secondsLeft = Math.round(ticksLeft / 20);
    const nextMessageIndex = messageIntervals.findIndex((interval) => interval === secondsLeft);

    if (nextMessageIndex !== -1 && nextMessageIndex !== lastMessageIndex) {
        const message = `${secondsLeft} second${secondsLeft > 1 ? "s" : ""}`;
        world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag will be cleared in ${message}!`);
        lastMessageIndex = nextMessageIndex;
    }

    yield; // single tick only
}

// ------------------- ENTITY CLEAR -------------------

/**
 * Removes item entities in all standard dimensions that match registered ItemTypes.
 * Uses Promise.all to batch the work for multiple dimensions concurrently.
 */
async function clearEntityItems() {
    const allTypes = ItemTypes.getAll();
    const dimensionIds = ["overworld", "nether", "the_end"];

    await Promise.all(
        dimensionIds.map(async (id) => {
            try {
                const dim = world.getDimension(id);
                const items = dim.getEntities({ type: "item" });
                for (const entity of items) {
                    const itemComp = entity.getComponent("item");
                    if (itemComp && allTypes.includes(itemComp.itemStack.type)) {
                        entity.remove();
                    }
                }
            } catch (e) {
                console.warn(`[Paradox] Failed to get dimension ${id}: ${e}`);
            }
        })
    );
}

/**
 * Removes non-tamed monster entities without name tags from the overworld,
 * skipping entity types in the exception set.
 * @param {number} [batchSize=50] - Maximum number of entities to remove per call
 */
async function clearEntities(batchSize: number = 50) {
    const overworld = world.getDimension("overworld");
    const monsters = overworld.getEntities({ families: ["monster"] });

    let count = 0;

    for (const entity of monsters) {
        const tameable = entity.getComponent("tameable");
        const isTamed = tameable?.isTamed ?? false;

        if (!entityException.has(entity.typeId) && !isTamed && !entity.nameTag) {
            entity.remove();
            count++;
            if (count >= batchSize) break; // prevent lag spikes
        }
    }
}

// ------------------- JOB EXECUTION -------------------

/**
 * Executes the lag clear generator as a background job.
 * Ensures only one job runs per tick.
 * @param {Object} clockSettings - Timer settings
 * @param {number} clockSettings.hours
 * @param {number} clockSettings.minutes
 * @param {number} clockSettings.seconds
 */
async function executeLagClear(clockSettings: { hours: number; minutes: number; seconds: number }) {
    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }

    if (globalEndTick === null) {
        globalEndTick = system.currentTick + timeToTicks(clockSettings.hours, clockSettings.minutes, clockSettings.seconds);
    }

    const jobPromise = new Promise<void>((resolve) => {
        function* jobRunner() {
            try {
                yield* lagClearGenerator(globalEndTick!);
            } finally {
                resolve();
            }
        }
        lagClearJobId = system.runJob(jobRunner());
    });

    await jobPromise;
}

// ------------------- START / STOP -------------------

/**
 * Starts the lag clear system with a countdown and interval runner.
 * @param {number} [hours=0]
 * @param {number} [minutes=5]
 * @param {number} [seconds=0]
 */
export async function startLagClear(hours: number = 0, minutes: number = 5, seconds: number = 0) {
    if (lagClearRunId !== null) system.clearRun(lagClearRunId);
    if (lagClearJobId !== null) system.clearJob(lagClearJobId);

    const clockSettings = { hours, minutes, seconds };
    globalEndTick = system.currentTick + timeToTicks(hours, minutes, seconds);

    let isRunning = false;
    let runIdBackup: number | null = null;

    lagClearRunId = system.runInterval(async () => {
        if (isRunning) {
            if (lagClearRunId !== null) system.clearRun(lagClearRunId);
            lagClearRunId = runIdBackup;
            return;
        }

        runIdBackup = lagClearRunId;
        isRunning = true;
        await executeLagClear(clockSettings);
        isRunning = false;
    }, 20);
}

/**
 * Stops the lag clear system and cleans up jobs and intervals.
 */
export function stopLagClear() {
    if (lagClearJobId !== null) system.clearJob(lagClearJobId);
    if (lagClearRunId !== null) system.clearRun(lagClearRunId);

    lagClearJobId = null;
    lagClearRunId = null;
    globalEndTick = null;
    lastMessageIndex = -1;
}
