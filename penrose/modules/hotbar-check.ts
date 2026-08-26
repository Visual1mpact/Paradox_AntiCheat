import { Player, PlayerHotbarSelectedSlotChangeAfterEvent } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Distributes an in-game alert notification to staff players possessing
 * Security Clearance Level 4 when an invalid hotbar slot index is detected.
 *
 * @param {Player} player - The player who triggered the out-of-bounds slot event.
 * @param {number} invalidSlot - The invalid hotbar slot index selected.
 */
function alertStaff(player: Player, invalidSlot: number): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "HotbarCheck", `Player flagged for out-of-bounds hotbar selection (Slot: ${invalidSlot})`);
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[HotbarCheck] §f${player.name} §7flagged for invalid hotbar slot selection (Slot: ${invalidSlot})`);
    }
}

/**
 * Monitors players' hotbar selection changes and validates that the selected slot
 * index falls within valid bounds (0 <= index <= 9).
 *
 * @param {PlayerHotbarSelectedSlotChangeAfterEvent} event - The event data containing player and slot details.
 */
function handleHotbarChange(event: PlayerHotbarSelectedSlotChangeAfterEvent): void {
    const { player, newSlotSelected } = event;

    if (!player || !player.isValid) return;

    /**
     * DETECTION LOGIC:
     * Check if the total hotbar selection slot index is less than 0 or greater than 9.
     */
    if (newSlotSelected < 0 || newSlotSelected > 9) {
        alertStaff(player, newSlotSelected);
    }
}

/**
 * Starts the Hotbar Selection Range detection module.
 */
export function startHotbarCheck(): void {
    EventCoordinator.subscribeAfter("playerHotbarSelectedSlotChange", handleHotbarChange);
}

/**
 * Stops the Hotbar Selection Range detection module.
 */
export function stopHotbarCheck(): void {
    EventCoordinator.unsubscribeAfter("playerHotbarSelectedSlotChange", handleHotbarChange);
}
