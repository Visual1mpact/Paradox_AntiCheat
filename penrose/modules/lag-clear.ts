import { world, system, ItemTypes } from "@minecraft/server";

const object = { cooldown: "String" };

let lagClearJobId: number | null = null;
let lagClearRunId: number | null = null;
let globalEndTick: number | null = null;
let lastMessageIndex = -1;

const cooldownTimer = new WeakMap<typeof object, number>();

/**
 * Generator function for lag clearing tasks.
 * Sends countdown messages and performs lag clearing when the countdown ends.
 * @param {number} endTick - The tick when the next lag clear is scheduled.
 * @yields {void} - Yields control after each tick.
 */
function* lagClearGenerator(endTick: number): Generator<void, void, unknown> {
    const messageIntervals = [60, 5, 4, 3, 2, 1];

    const currentTick = system.currentTick;
    const ticksLeft = endTick - currentTick;

    if (ticksLeft <= 0) {
        clearEntityItems();
        clearEntities();
        world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag has been cleared!`);

        cooldownTimer.set(object, currentTick);

        globalEndTick = null;
        lastMessageIndex = -1;
        return; // Stop running this job until next startLagClear() fires
    } else {
        const secondsLeft = Math.round(ticksLeft / 20);
        const nextMessageIndex = messageIntervals.findIndex((interval) => interval === secondsLeft);

        if (nextMessageIndex !== -1 && nextMessageIndex !== lastMessageIndex) {
            const message = `${messageIntervals[nextMessageIndex]} second${messageIntervals[nextMessageIndex] > 1 ? "s" : ""}`;
            world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag will be cleared in ${message}!`);
            lastMessageIndex = nextMessageIndex;
        }
    }

    yield;
}

/**
 * Clears item entities in the overworld.
 */
async function clearEntityItems() {
    const entitiesCache = world.getDimension("overworld").getEntities({ type: "item" });
    for (const entity of entitiesCache) {
        const itemName = entity.getComponent("item");
        if (itemName && ItemTypes.getAll().includes(itemName.itemStack.type)) {
            entity.remove();
        }
    }
}

/**
 * Clears monster entities without name tags in the overworld.
 */
async function clearEntities() {
    const entityException = ["minecraft:ender_dragon", "minecraft:shulker", "minecraft:hoglin", "minecraft:zoglin", "minecraft:piglin_brute", "minecraft:evocation_illager", "minecraft:vindicator", "minecraft:elder_guardian"];
    const entitiesCache = world.getDimension("overworld").getEntities({ families: ["monster"] });
    for (const entity of entitiesCache) {
        if (!entityException.includes(entity.typeId) && !entity.nameTag) {
            entity.remove();
        }
    }
}

/**
 * Executes the lag clear generator as a background job.
 * @param {Object} clockSettings - Settings for the timer.
 * @returns {Promise<void>} Resolves when the generator completes.
 */
async function executeLagClear(clockSettings: { hours: number; minutes: number; seconds: number }): Promise<void> {
    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }

    if (globalEndTick === null) {
        globalEndTick = system.currentTick + (clockSettings.hours * 72000 + clockSettings.minutes * 1200 + clockSettings.seconds * 20);
    }

    const jobPromise = new Promise<void>((resolve) => {
        function* jobRunner() {
            yield* lagClearGenerator(globalEndTick!);
            resolve();
        }
        lagClearJobId = system.runJob(jobRunner());
    });

    await jobPromise;
}

/**
 * Starts the lag clear system with regular execution.
 * @param {number} [hours=0] - Hours until lag clear.
 * @param {number} [minutes=5] - Minutes until lag clear.
 * @param {number} [seconds=0] - Seconds until lag clear.
 */
export async function startLagClear(hours: number = 0, minutes: number = 5, seconds: number = 0): Promise<void> {
    if (lagClearRunId !== null) {
        system.clearRun(lagClearRunId);
    }

    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }

    const clockSettings = { hours, minutes, seconds };
    const newEndTick = system.currentTick + (hours * 72000 + minutes * 1200 + seconds * 20);
    globalEndTick = newEndTick;

    let isRunning = false;
    let runIdBackup: number;

    lagClearRunId = system.runInterval(async () => {
        if (isRunning) {
            system.clearRun(lagClearRunId);
            lagClearRunId = runIdBackup;
            return;
        }

        runIdBackup = lagClearRunId!;
        isRunning = true;

        await executeLagClear(clockSettings);
        isRunning = false;
    }, 20);
}

/**
 * Stops the lag clear system and cleans up jobs and intervals.
 */
export function stopLagClear(): void {
    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }
    if (lagClearRunId !== null) {
        system.clearRun(lagClearRunId);
    }
}
