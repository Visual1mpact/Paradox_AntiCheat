import { system, Player, EquipmentSlot, EntityEquippableComponent, PlayerLeaveAfterEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

const TOTEM_ID = "minecraft:totem_of_undying";
/**
 * Minimum ticks allowed between losing a totem and equipping a new one.
 * Human UI interaction usually takes 15-30 ticks. 5 ticks is a safe threshold.
 */
const MIN_SWAP_TICKS = 5;

interface AutoTotemModuleConfig {
    enabled?: boolean;
}

/**
 * Tracks per-player totem usage state.
 * - lastPopTick: tick when a totem was consumed (offhand emptied)
 * - lastOffhandState: whether a totem was previously in offhand
 */
const playerTotemData = new Map<string, { lastPopTick: number; lastOffhandState: boolean }>();

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

/** Reference to the player leave event subscription */
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an AutoTotem violation occurs.
 *
 * @param {Player} player - The player flagged for suspicious totem replenishment.
 * @param {number} ticks - The time in ticks taken to replenish the totem.
 */
function alertStaff(player: Player, ticks: number): void {
    const staff = getSecurityClearanceLevel4Players();

    for (const s of staff) {
        const isStaffValid = s.isValid;
        if (!isStaffValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[AutoTotem] §f${player.name} §7replenished totem in §e${ticks} ticks§7.`);
    }
}

/**
 * Continuous generator loop that scans players for suspicious totem replenishment.
 * Runs incrementally to avoid blocking the main thread.
 */
function* continuousAutoTotemLoop(moduleConfig: AutoTotemModuleConfig | undefined): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        // Check pre-fetched module status without using inline promises inside the generator
        const isEnabled = moduleConfig?.enabled ?? false;
        if (!isEnabled) return;

        for (const player of PlayerCache.getPlayers()) {
            if (!player?.isValid) continue;

            try {
                // Exempt high-security staff
                if ((player.getDynamicProperty("securityClearance") as number) === 4) continue;

                const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
                if (!equippable) continue;

                const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
                const hasTotem = offhand?.typeId === TOTEM_ID;

                let data = playerTotemData.get(player.id);
                if (!data) {
                    playerTotemData.set(player.id, { lastPopTick: 0, lastOffhandState: hasTotem });
                    continue;
                }

                /**
                 * DETECTION MATRIX:
                 * Detects instant totem replenishment (Empty -> Totem too quickly),
                 * typical of auto-totem cheats.
                 */
                if (!data.lastOffhandState && hasTotem) {
                    const ticksSinceChange = system.currentTick - data.lastPopTick;

                    // If replenished instantly (usually 1-2 ticks for cheats)
                    if (ticksSinceChange < MIN_SWAP_TICKS && data.lastPopTick !== 0) {
                        alertStaff(player, ticksSinceChange);

                        /**
                         * MITIGATION INLINE:
                         * Removes the illegitimately equipped totem instantly to prevent abuse.
                         */
                        equippable.setEquipment(EquipmentSlot.Offhand, undefined);
                    }
                }

                /**
                 * TRACKING COMPONENT:
                 * Detects when a totem is consumed (Totem -> Empty/Other).
                 * Stores the tick for future replenishment timing checks.
                 */
                if (data.lastOffhandState && !hasTotem) {
                    data.lastPopTick = system.currentTick;
                }

                data.lastOffhandState = hasTotem;
            } catch (e) {
                // Safeguard against rare runtime detachment exceptions
            }

            // Yield control back to engine processing after evaluating each individual player
            yield;
        }
    } finally {
        isJobActive = false;

        // Request next pass recursion smoothly for the very next engine tick frame
        if (isModuleActive) {
            system.run(async () => {
                // Pre-fetch DB state outside generator on the loop continuation pass
                const nextConfig = (await paradoxModulesDB.get("autoTotemCheck_b")) as AutoTotemModuleConfig | undefined;
                system.runJob(continuousAutoTotemLoop(nextConfig));
            });
        }
    }
}

/**
 * Cleans up player-specific data when a player leaves the world.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent): void {
    playerTotemData.delete(event.playerId);
}

/**
 * Starts the auto-totem detection loop monitoring ecosystem.
 */
export async function startAutoTotemCheck(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = handlePlayerLeave;
        EventCoordinator.subscribeAfter("playerLeave", playerLeaveSubscription);
    }

    if (!isJobActive) {
        try {
            // Await initial database fetch before spawning the generator job
            const initialConfig = (await paradoxModulesDB.get("autoTotemCheck_b")) as AutoTotemModuleConfig | undefined;

            // Guard against module stopping while the database call was pending
            if (!isModuleActive) return;

            system.runJob(continuousAutoTotemLoop(initialConfig));
        } catch (e) {
            console.error(`[Paradox] Failed to load config for auto totem check: ${e}`);
            isModuleActive = false;
        }
    }
}

/**
 * Stops the detection loop and clears all active structural trackers.
 */
export function stopAutoTotemCheck() {
    isModuleActive = false;

    if (playerLeaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    playerTotemData.clear();
}
