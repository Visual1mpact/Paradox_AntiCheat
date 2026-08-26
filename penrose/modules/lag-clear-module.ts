import { world, system, ItemTypes } from "@minecraft/server";

// ------------------- CONFIG -------------------

/** Object used as a key for cooldown tracking in WeakMap */
const object = { cooldown: "String" };

/** WeakMap to track cooldowns for lag clear operations */
const cooldownTimer = new WeakMap<typeof object, number>();

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

/** Tick at which the next lag clear should execute */
let globalEndTick: number | null = null;

/** Index of the last countdown message sent */
let lastMessageIndex = -1;

/** Configuration parameters cached during setup */
let savedClockSettings = { hours: 0, minutes: 5, seconds: 0 };

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
 */
function timeToTicks(h: number, m: number, s: number): number {
    return h * 72000 + m * 1200 + s * 20;
}

// ------------------- ENTITY CLEAR -------------------

/**
 * Removes item entities in all standard dimensions that match registered ItemTypes.
 */
function clearEntityItems() {
    const allTypes = ItemTypes.getAll();
    const dimensionIds = ["overworld", "nether", "the_end"];

    for (const id of dimensionIds) {
        try {
            const dim = world.getDimension(id);
            const items = dim.getEntities({ type: "item" });
            for (const entity of items) {
                // Safeguard check for entity validity
                const isValid = entity.isValid;
                if (!isValid) continue;

                const itemComp = entity.getComponent("item");
                if (itemComp && allTypes.includes(itemComp.itemStack.type)) {
                    entity.remove();
                }
            }
        } catch (e) {
            console.warn(`[Paradox] Failed to clear item entities in dimension ${id}: ${e}`);
        }
    }
}

/**
 * Removes non-tamed monster entities without name tags from the overworld,
 * skipping entity types in the exception set.
 */
function clearEntities(batchSize: number = 50) {
    try {
        const overworld = world.getDimension("overworld");
        const monsters = overworld.getEntities({ families: ["monster"] });

        let count = 0;

        for (const entity of monsters) {
            const isValid = entity.isValid;
            if (!isValid) continue;

            const tameable = entity.getComponent("tameable");
            const isTamed = tameable?.isTamed ?? false;

            if (!entityException.has(entity.typeId) && !isTamed && !entity.nameTag) {
                entity.remove();
                count++;
                if (count >= batchSize) break; // prevent sudden frame spikes
            }
        }
    } catch (e) {
        console.warn(`[Paradox] Failed to clear monster entities: ${e}`);
    }
}

// ------------------- LAG CLEAR ENGINE -------------------

/**
 * Continuous generator loop that handles ticks of countdown and clearing operations.
 */
function* continuousLagClearLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        // Initialize target point if it dropped out or was reset
        if (globalEndTick === null) {
            globalEndTick = system.currentTick + timeToTicks(savedClockSettings.hours, savedClockSettings.minutes, savedClockSettings.seconds);
        }

        const currentTick = system.currentTick;
        const ticksLeft = globalEndTick - currentTick;

        // EXECUTE TRIGGER TIMESLOT REACHED
        if (ticksLeft <= 0) {
            clearEntityItems();
            clearEntities();
            world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag has been cleared!`);

            cooldownTimer.set(object, currentTick);

            // Setup variables for the next recurring cycle instantly
            globalEndTick = currentTick + timeToTicks(savedClockSettings.hours, savedClockSettings.minutes, savedClockSettings.seconds);
            lastMessageIndex = -1;
        } else {
            // EVALUATE COUNTDOWN WARNINGS
            const secondsLeft = Math.round(ticksLeft / 20);
            const nextMessageIndex = messageIntervals.findIndex((interval) => interval === secondsLeft);

            if (nextMessageIndex !== -1 && nextMessageIndex !== lastMessageIndex) {
                const message = `${secondsLeft} second${secondsLeft > 1 ? "s" : ""}`;
                world.sendMessage(`§2[§7Paradox§2]§o§7 Server lag will be cleared in ${message}!`);
                lastMessageIndex = nextMessageIndex;
            }
        }
    } catch (e) {
        console.error(`[Paradox] Error during lag clear pass: ${e}`);
    } finally {
        isJobActive = false;

        // Request next frame recursion step smoothly
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousLagClearLoop());
            });
        }
    }
}

// ------------------- START / STOP -------------------

/**
 * Starts the lag clear system tracking scheduler.
 */
export function startLagClear(hours: number = 0, minutes: number = 5, seconds: number = 0) {
    if (isModuleActive) return;
    isModuleActive = true;

    savedClockSettings = { hours, minutes, seconds };
    globalEndTick = system.currentTick + timeToTicks(hours, minutes, seconds);
    lastMessageIndex = -1;

    if (!isJobActive) {
        system.runJob(continuousLagClearLoop());
    }
}

/**
 * Stops the lag clear system and cleans up running allocations.
 */
export function stopLagClear() {
    isModuleActive = false;
    globalEndTick = null;
    lastMessageIndex = -1;
}
