import { GameMode, PlayerGameModeChangeAfterEvent, world } from "@minecraft/server";
import { paradoxModulesDB } from "../paradox";

// Represents the game mode settings stored in the database
interface ModeSettings {
    adventure: boolean;
    creative: boolean;
    survival: boolean;
    spectator: boolean;
}

/**
 * Handles game mode change events and enforces allowed game modes.
 * Reverts the game mode to the previous state if the new game mode is not allowed.
 * @param {PlayerGameModeChangeAfterEvent} event - The game mode change event containing player information and the new game mode.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): void {
    const player = event.player;

    // Skip enforcement for players with security clearance 4
    if ((player.getDynamicProperty("securityClearance") as number) === 4) {
        return;
    }

    const modeKeys = {
        settings: "gamemode_settings",
    };

    const modeSettings = paradoxModulesDB.get<ModeSettings>(modeKeys.settings) ?? {
        adventure: true,
        creative: true,
        survival: true,
        spectator: true,
    };

    const modeStates: ModeSettings = {
        adventure: modeSettings.adventure,
        creative: modeSettings.creative,
        survival: modeSettings.survival,
        spectator: modeSettings.spectator,
    };

    const newGameMode = event.toGameMode;
    const previousGameMode = event.fromGameMode;

    // Check if the new game mode is allowed
    const isAllowedNew = modeStates[newGameMode as keyof ModeSettings] ?? false;

    // If the new game mode is allowed, exit
    if (isAllowedNew) {
        return;
    }

    // Check if the previous game mode is allowed
    const isAllowedPrevious = modeStates[previousGameMode as keyof ModeSettings] ?? false;

    // Determine a fallback game mode
    const fallbackGameMode = (Object.keys(modeStates) as (keyof ModeSettings)[]).find((key) => modeStates[key]) as GameMode | null;

    // Revert to the previous game mode if allowed, otherwise switch to the fallback game mode
    if (isAllowedPrevious) {
        player.setGameMode(previousGameMode);
    } else if (fallbackGameMode) {
        player.setGameMode(fallbackGameMode);
    }
}

/**
 * Monitors game mode changes and enforces allowed game modes.
 * Subscribes to the game mode change event and handles it using the `handleGameModeChange` function.
 */
export function startGameModeCheck() {
    world.afterEvents.playerGameModeChange.subscribe(handleGameModeChange);
}

/**
 * Stops monitoring game mode changes.
 */
export function stopGameModeCheck() {
    world.afterEvents.playerGameModeChange.unsubscribe(handleGameModeChange);
}
