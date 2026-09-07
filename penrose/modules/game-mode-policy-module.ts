import { GameMode, PlayerGameModeChangeAfterEvent, Player } from "@minecraft/server";
import { GamemodeCheckSettings } from "../types/db-types";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

/** Active in-memory gamemode restriction settings */
let activeSettings: GamemodeCheckSettings = {
    Adventure: true,
    Creative: true,
    Survival: true,
    Spectator: true,
};

/** Reference to the gamemode change event handler */
let gameModeChangeSub: ((event: PlayerGameModeChangeAfterEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an illegal gamemode change occurs.
 *
 * @param {Player} player - The player attempting the unauthorized gamemode change.
 * @param {GameMode} attemptedGM - The illegal gamemode they attempted to switch to.
 */
function alertStaff(player: Player, attemptedGM: GameMode): void {
    FlagManager.logFlag(player, "Gamemode", `Player attempted to switch to ${attemptedGM}`);
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Gamemode] §f${player.name} §7attempted to switch to §e${attemptedGM}`);
    }
}

/**
 * Handles game mode change events and enforces allowed game modes.
 *
 * @param {PlayerGameModeChangeAfterEvent} event - The game mode change event payload.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): void {
    const player = event.player;

    // Bypass for high-security users
    if ((player.getDynamicProperty("securityClearance") as number) === 4) return;

    const to = event.toGameMode as GameMode;
    const from = event.fromGameMode as GameMode;

    const isAllowed = (gm: GameMode): boolean => activeSettings[gm as keyof GamemodeCheckSettings] ?? false;

    if (isAllowed(to)) return;

    // VIOLATION VERIFIED: Send staff alert before reverting/reassigning gamemode
    alertStaff(player, to);

    if (isAllowed(from)) {
        player.setGameMode(from);
        return;
    }

    const fallback = [GameMode.Survival, GameMode.Adventure, GameMode.Creative, GameMode.Spectator].find((gm) => isAllowed(gm));

    if (fallback) {
        player.setGameMode(fallback);
    } else {
        player.sendMessage("§c[Paradox] No game modes are currently allowed. Contact an admin.");
    }
}

/**
 * Subscribes to game mode changes and enforces restrictions.
 *
 * @param {GamemodeCheckSettings} [settings] - Allowed gamemodes configuration.
 */
export function startGameModeCheck(settings?: GamemodeCheckSettings): void {
    if (settings) {
        activeSettings = settings;
    }

    if (gameModeChangeSub) return;
    gameModeChangeSub = handleGameModeChange;
    EventCoordinator.subscribeAfter("playerGameModeChange", gameModeChangeSub);
}

/**
 * Unsubscribes from game mode change enforcement.
 */
export function stopGameModeCheck(): void {
    if (!gameModeChangeSub) return;
    EventCoordinator.unsubscribeAfter("playerGameModeChange", gameModeChangeSub);
    gameModeChangeSub = undefined;
}
