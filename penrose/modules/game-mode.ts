import { GameMode, PlayerGameModeChangeAfterEvent, Player } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { GamemodeCheckSettings } from "../classes/database/db-types";
import { EventCoordinator } from "../classes/event-coordinator";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an illegal gamemode change occurs.
 *
 * @param {Player} player - The player attempting the unauthorized gamemode change.
 * @param {GameMode} attemptedGM - The illegal gamemode they attempted to switch to.
 */
function alertStaff(player: Player, attemptedGM: GameMode): void {
    const staff = getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Gamemode] §f${player.name} §7attempted to switch to §e${attemptedGM}`);
    }
}

/**
 * Handles game mode change events and enforces allowed game modes.
 * @param event - The game mode change event.
 */
async function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): Promise<void> {
    const player = event.player;

    // Bypass for high-security users
    if ((player.getDynamicProperty("securityClearance") as number) === 4) return;

    const settings = (await paradoxModulesDB.get("gamemodeCheck_b"))?.settings ?? {
        Adventure: true,
        Creative: true,
        Survival: true,
        Spectator: true,
    };

    const to = event.toGameMode as GameMode;
    const from = event.fromGameMode as GameMode;

    const isAllowed = (gm: GameMode): boolean => settings[gm as keyof GamemodeCheckSettings] ?? false;

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
