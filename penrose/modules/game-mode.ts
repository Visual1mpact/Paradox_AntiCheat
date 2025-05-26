import { GameMode, PlayerGameModeChangeAfterEvent, world } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { GamemodeCheckSettings } from "../classes/database/db-types";

/**
 * Handles game mode change events and enforces allowed game modes.
 * @param event - The game mode change event.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): void {
    const player = event.player;

    // Bypass for high-security users
    if ((player.getDynamicProperty("securityClearance") as number) === 4) return;

    const settings = paradoxModulesDB.get("gamemodeCheck_b")?.settings ?? {
        adventure: true,
        creative: true,
        survival: true,
        spectator: true,
    };

    const to = event.toGameMode as GameMode;
    const from = event.fromGameMode as GameMode;

    const isAllowed = (gm: GameMode): boolean => settings[gm as keyof GamemodeCheckSettings] ?? false;

    if (isAllowed(to)) return;

    if (isAllowed(from)) {
        player.setGameMode(from);
        return;
    }

    const fallback = [GameMode.survival, GameMode.adventure, GameMode.creative, GameMode.spectator].find((gm) => isAllowed(gm));

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
    world.afterEvents.playerGameModeChange.subscribe(handleGameModeChange);
}

/**
 * Unsubscribes from game mode change enforcement.
 */
export function stopGameModeCheck() {
    world.afterEvents.playerGameModeChange.unsubscribe(handleGameModeChange);
}
