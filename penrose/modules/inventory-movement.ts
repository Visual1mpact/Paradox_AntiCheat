import { Player, system, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/event-coordinator";
import { PlayerCache } from "../classes/cache/player-cache";
import { FlagManager } from "../classes/logs/flag-manager";

/**
 * In-memory state cache to prevent querying the database every tick.
 */
let isModuleEnabled = false;
let runIntervalId: number | null = null;

/**
 * Fast set containing ONLY player IDs that need validation on the next tick.
 * Avoids iterating/checking velocity on un-flagged players.
 */
const pendingValidationSet = new Set<string>();

/**
 * Cleanup function for the EventCoordinator subscription.
 */
let unsubscribeInventoryChange: (() => void) | null = null;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an Inventory Movement violation occurs.
 */
function alertStaff(player: Player): void {
    const staff = getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "InvMove", "Player flagged for moving items in inventory while moving.");
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvMove] §f${player.name} §7flagged for moving items in inventory while moving.`);
    }
}

/**
 * Fast horizontal velocity calculation without extra object allocations.
 */
function isPlayerMoving(player: Player): boolean {
    const vel = player.getVelocity();
    // Square magnitude check: (x^2 + z^2 > 0.0001) avoids Math.sqrt()
    return vel.x * vel.x + vel.z * vel.z > 0.0001;
}

/**
 * Handles the inventory item change event via EventCoordinator.
 * Analogous to receiving an ItemStackRequest packet in Go.
 */
function handleInventoryChange(event: { player: Player }): void {
    if (!isModuleEnabled) return;

    const player = event.player;
    if (!player?.isValid) return;

    // Only queue player if they are actively moving when the inventory change occurs
    if (isPlayerMoving(player)) {
        pendingValidationSet.add(player.id);
    }
}

/**
 * Highly optimized synchronous tick check.
 * Executes in O(1) time when no players are interacting with inventory while moving.
 */
function checkInventoryMovement(): void {
    // Early Exit if module is disabled or no players were queued during an inventory event
    if (!isModuleEnabled || pendingValidationSet.size === 0) return;

    // Only iterate players explicitly in the validation queue
    for (const playerId of pendingValidationSet) {
        const player = PlayerCache.getPlayerById(playerId);

        if (!player) continue;

        if (player.getGameMode() !== GameMode.Spectator) {
            // Re-evaluate if they are STILL moving on the tick following inventory interaction
            if (isPlayerMoving(player)) {
                player.clearVelocity();
                alertStaff(player);
            }
        }
    }

    // Clear the queue in O(1) time for the next tick cycle
    pendingValidationSet.clear();
}

/**
 * Loads the initial state from DB, registers event listeners, and starts the 1-tick check loop.
 */
export async function startInventoryMovementCheck(): Promise<void> {
    const dbData = await paradoxModulesDB.get("inventoryMovementCheck_b");
    isModuleEnabled = dbData?.enabled ?? false;

    if (!unsubscribeInventoryChange) {
        unsubscribeInventoryChange = EventCoordinator.subscribeAfter("playerInventoryItemChange", handleInventoryChange);
    }

    if (runIntervalId !== null) return;

    runIntervalId = system.runInterval(() => {
        checkInventoryMovement();
    }, 1);
}

/**
 * Stops the Inventory Movement detection module and cleans up event listeners.
 */
export function stopInventoryMovementCheck(): void {
    isModuleEnabled = false;

    if (runIntervalId !== null) {
        system.clearRun(runIntervalId);
        runIntervalId = null;
    }

    if (unsubscribeInventoryChange) {
        unsubscribeInventoryChange();
        unsubscribeInventoryChange = null;
    }

    pendingValidationSet.clear();
}

/**
 * Helper to update the in-memory module state when toggled by a command.
 */
export function setInventoryMovementState(enabled: boolean): void {
    isModuleEnabled = enabled;
    if (!enabled) {
        pendingValidationSet.clear();
    }
}
