import { system, Player, EquipmentSlot, EntityEquippableComponent, world, PlayerLeaveAfterEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/player-cache";

const TOTEM_ID = "minecraft:totem_of_undying";
/**
 * Minimum ticks allowed between losing a totem and equipping a new one.
 * Human UI interaction usually takes 15-30 ticks. 5 ticks is a safe threshold.
 */
const MIN_SWAP_TICKS = 5;

/**
 * Tracks per-player totem usage state.
 * - lastPopTick: tick when a totem was consumed (offhand emptied)
 * - lastOffhandState: whether a totem was previously in offhand
 */
const playerTotemData = new Map<string, { lastPopTick: number; lastOffhandState: boolean }>();

/** Stores the active background job ID for the detection loop */
let autoTotemJobId: number | null = null;

/** Reference to the player leave event subscription */
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Generator loop that scans players for suspicious totem replenishment.
 * Runs incrementally to avoid blocking the main thread.
 */
function* autoTotemCheckGenerator(): Generator<void, void, unknown> {
    const isEnabled = paradoxModulesDB.get("autoTotemCheck_b")?.enabled ?? false;
    if (!isEnabled) return;

    for (const player of PlayerCache.getPlayers()) {
        if (player.isValid) {
            try {
                // Exempt high-security staff
                if ((player.getDynamicProperty("securityClearance") as number) === 4) continue;

                const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
                if (!equippable) continue;

                const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
                const hasTotem = offhand?.typeId === TOTEM_ID;

                let data = playerTotemData.get(player.id);
                if (!data) {
                    data = { lastPopTick: 0, lastOffhandState: hasTotem };
                    playerTotemData.set(player.id, data);
                    continue;
                }

                /**
                 * DETECTION:
                 * Detects instant totem replenishment (Empty -> Totem too quickly),
                 * which is typical of auto-totem cheats.
                 */
                if (!data.lastOffhandState && hasTotem) {
                    const ticksSinceChange = system.currentTick - data.lastPopTick;

                    // If replenished instantly (usually 1-2 ticks for cheats)
                    if (ticksSinceChange < MIN_SWAP_TICKS && data.lastPopTick !== 0) {
                        alertStaff(player, ticksSinceChange);

                        /**
                         * MITIGATION:
                         * Removes the illegitimately equipped totem to prevent abuse.
                         */
                        const pId = player.id;
                        system.run(() => {
                            const target = PlayerCache.getPlayerById(pId);
                            if (target?.isValid) {
                                const inv = target.getComponent("minecraft:equippable") as EntityEquippableComponent;
                                inv?.setEquipment(EquipmentSlot.Offhand, undefined);
                            }
                        });
                    }
                }

                /**
                 * TRACKING:
                 * Detects when a totem is consumed (Totem -> Empty/Other).
                 * Stores the tick for future replenishment timing checks.
                 */
                if (data.lastOffhandState && !hasTotem) {
                    data.lastPopTick = system.currentTick;
                }

                data.lastOffhandState = hasTotem;
            } catch (e) {}
        }
        yield;
    }
}

/**
 * Runs the generator as a scheduled background job.
 * Ensures completion before resolving.
 */
async function executeAutoTotemCheck(): Promise<void> {
    if (autoTotemJobId !== null) system.clearJob(autoTotemJobId);

    const jobPromise = new Promise<void>((resolve) => {
        function* runner() {
            try {
                yield* autoTotemCheckGenerator();
            } finally {
                resolve();
            }
        }
        autoTotemJobId = system.runJob(runner());
    });

    await jobPromise;
}

/**
 * Cleans up player-specific data when a player leaves the world.
 * Without this cleanup, `playerTotemData` would retain entries for
 * players that have disconnected, causing the Map to grow indefinitely.
 * @param event - The playerLeave event containing the leaving player's ID.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent): void {
    playerTotemData.delete(event.playerId);
}

/**
 * Sends a formatted alert to level 4 staff about a violation.
 */
function alertStaff(player: Player, ticks: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[AutoTotem] §f${player.name} §7replenished totem in §e${ticks} ticks§7.`);
    }
}

/** Interval ID for the repeating detection loop */
let intervalId: number | undefined;

/**
 * Starts the auto-totem detection loop.
 * Prevents overlapping executions using a simple lock mechanism.
 */
export function startAutoTotemCheck() {
    if (intervalId !== undefined) return;

    // Subscribe to player leave event for cleanup
    playerLeaveSubscription = world.afterEvents.playerLeave.subscribe(handlePlayerLeave);

    let isRunning = false;
    let runIdBackup: number | undefined;

    intervalId = system.runInterval(async () => {
        if (isRunning) {
            // Restore the backup runId if an overlap is detected
            system.clearRun(intervalId as number);
            intervalId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        runIdBackup = intervalId;
        isRunning = true;
        await executeAutoTotemCheck();
        isRunning = false;
    }, 1);
}

/**
 * Stops the detection loop and clears all tracking data.
 */
export function stopAutoTotemCheck() {
    if (intervalId !== undefined) {
        system.clearRun(intervalId);
        intervalId = undefined;
    }

    // Unsubscribe from player leave event
    if (playerLeaveSubscription) {
        world.afterEvents.playerLeave.unsubscribe(playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }
    if (autoTotemJobId !== null) {
        system.clearJob(autoTotemJobId);
        autoTotemJobId = null;
    }
    playerTotemData.clear();
}
