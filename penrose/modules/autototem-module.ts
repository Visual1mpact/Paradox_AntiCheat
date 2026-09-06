import { system, Player, EquipmentSlot, EntityEquippableComponent, PlayerLeaveAfterEvent } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Minimum ticks allowed between losing a totem and equipping a new one.
 */
const MIN_SWAP_TICKS = 5;
const TOTEM_ID = "minecraft:totem_of_undying";

/**
 * Interface tracking per-player totem usage state.
 */
interface PlayerTotemState {
    lastPopTick: number;
    lastOffhandState: boolean;
}

/** Per-player state map for tracking totem swaps */
const playerTotemData = new Map<string, PlayerTotemState>();

/** Flag indicating whether the module is active */
let isModuleActive = false;
/** Active job handle ID returned by system.runJob */
let activeJobId: number | undefined;

/** Reference to the player leave event subscription */
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to all active Level 4 staff.
 *
 * @param {Player} player - The player flagged for suspicious totem replenishment.
 * @param {number} ticks - The time in ticks taken to replenish the totem.
 */
function alertStaff(player: Player, ticks: number): void {
    FlagManager.logFlag(player, "AutoTotem", `Player replenished totem in ${ticks} ticks.`);
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[AutoTotem] §f${player.name} §7replenished totem in §e${ticks} ticks§7.`);
    }
}

/**
 * Evaluates whether a player is exempt from anti-cheat checks.
 *
 * @param {Player} player - The player instance to check.
 * @returns {boolean} True if the player should be skipped, false otherwise.
 */
function isPlayerExempt(player: Player): boolean {
    return !player?.isValid || (player.getDynamicProperty("securityClearance") as number) === 4;
}

/**
 * Evaluates a single player's offhand status and handles auto-totem detection/mitigation.
 *
 * @param {Player} player - The target player to evaluate.
 */
function processPlayerTotemCheck(player: Player): void {
    const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
    if (!equippable) return;

    const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
    const hasTotem = offhand?.typeId === TOTEM_ID;

    let data = playerTotemData.get(player.id);
    if (!data) {
        playerTotemData.set(player.id, { lastPopTick: 0, lastOffhandState: hasTotem });
        return;
    }

    if (!data.lastOffhandState && hasTotem) {
        const ticksSinceChange = system.currentTick - data.lastPopTick;
        if (ticksSinceChange < MIN_SWAP_TICKS && data.lastPopTick !== 0) {
            alertStaff(player, ticksSinceChange);
            equippable.setEquipment(EquipmentSlot.Offhand, undefined);
        }
    }

    if (data.lastOffhandState && !hasTotem) {
        data.lastPopTick = system.currentTick;
    }

    data.lastOffhandState = hasTotem;
}

/**
 * Continuous generator loop that scans players for suspicious totem replenishment.
 */
function* continuousAutoTotemLoop(): Generator<void, void, unknown> {
    if (!isModuleActive) return;

    try {
        for (const player of PlayerCache.getPlayers()) {
            // Immediate mid-loop cancellation check
            if (!isModuleActive) break;
            if (isPlayerExempt(player)) continue;

            try {
                processPlayerTotemCheck(player);
            } catch {
                // Safeguard against rare runtime detachment exceptions
            }

            yield;
        }
    } finally {
        activeJobId = undefined;
        if (isModuleActive) {
            system.run(() => {
                if (isModuleActive) {
                    activeJobId = system.runJob(continuousAutoTotemLoop());
                }
            });
        }
    }
}

/**
 * Cleans up player-specific data when a player leaves the world.
 *
 * @param {PlayerLeaveAfterEvent} event - The player leave event object.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent): void {
    playerTotemData.delete(event.playerId);
}

/**
 * Starts the auto-totem detection loop monitoring ecosystem.
 */
export function startAutoTotemCheck(): void {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = handlePlayerLeave;
        EventCoordinator.subscribeAfter("playerLeave", playerLeaveSubscription);
    }

    if (activeJobId === undefined) {
        activeJobId = system.runJob(continuousAutoTotemLoop());
    }
}

/**
 * Stops the detection loop and clears all active structural trackers.
 */
export function stopAutoTotemCheck(): void {
    isModuleActive = false;

    if (activeJobId !== undefined) {
        system.clearJob(activeJobId);
        activeJobId = undefined;
    }

    if (playerLeaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    playerTotemData.clear();
}
