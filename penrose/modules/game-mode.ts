import { GameMode, PlayerGameModeChangeAfterEvent } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { GamemodeCheckSettings } from "../classes/database/db-types";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * Handles game mode change events and enforces allowed game modes.
 * @param event - The game mode change event.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): void {
    const player = event.player;

    // Bypass for high-security users
    if ((player.getDynamicProperty("securityClearance") as number) === 4) return;

    const settings = paradoxModulesDB.get("gamemodeCheck_b")?.settings ?? {
        Adventure: true,
        Creative: true,
        Survival: true,
        Spectator: true,
    };

    const to = event.toGameMode as GameMode;
    const from = event.fromGameMode as GameMode;

    const isAllowed = (gm: GameMode): boolean => settings[gm as keyof GamemodeCheckSettings] ?? false;

    if (isAllowed(to)) return;

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
 */
export function startGameModeCheck() {
    EventCoordinator.subscribeAfter("playerGameModeChange", handleGameModeChange);
}

/**
 * Unsubscribes from game mode change enforcement.
 */
export function stopGameModeCheck() {
    EventCoordinator.unsubscribeAfter("playerGameModeChange", handleGameModeChange);
}
