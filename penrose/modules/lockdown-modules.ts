import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { PlayerCache } from "../classes/cache/player-cache";

const LOCKDOWN_REASON = "Under Maintenance! Sorry for the inconvenience.";
const MODULE_KEY = "paradoxOPSEC";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Retrieves the stored Paradox OPSEC security data from the world properties.
 */
function getSecurityData(): SecurityClearanceData {
    const raw = world.getDynamicProperty(MODULE_KEY) as string;
    if (!raw) return { securityClearanceList: [] };

    try {
        return JSON.parse(raw);
    } catch {
        return { securityClearanceList: [] };
    }
}

/**
 * Checks if a player is exempt from lockdown (System Host or Level 4 Clearance).
 *
 * @param {Player} player - Target player instance.
 * @param {SecurityClearanceData} data - Loaded OPSEC configuration data.
 * @returns {boolean} True if exempt from lockdown restrictions.
 */
function isExempt(player: Player, data: SecurityClearanceData): boolean {
    const isHost = Boolean(data.host?.id && player.id === data.host.id);
    const isLevelFour = (player.getDynamicProperty("securityClearance") as number) === 4;

    return isHost || isLevelFour;
}

/**
 * Validates player permissions upon spawn during lockdown.
 *
 * @param {PlayerSpawnAfterEvent} event - Event payload for player spawn.
 */
function handlePlayerSpawn(event: PlayerSpawnAfterEvent): void {
    if (!event.initialSpawn) return;

    const data = getSecurityData();
    if (!isExempt(event.player, data)) {
        event.player.runCommand(`kick @s ${LOCKDOWN_REASON}`);
    }
}

/**
 * Kicks all active non-exempt players from the server.
 */
export function enforceLockdown(): void {
    const data = getSecurityData();
    for (const target of PlayerCache.getPlayers()) {
        if (!isExempt(target, data)) {
            target.runCommand(`kick @s ${LOCKDOWN_REASON}`);
        }
    }
}

/**
 * Starts the server lockdown module listeners and optionally kicks active non-exempt players.
 *
 * @param {boolean} [kickOnlinePlayers=true] - Whether to kick currently connected non-exempt players.
 */
export function startLockdown(kickOnlinePlayers: boolean = true): void {
    if (kickOnlinePlayers) {
        enforceLockdown();
    }
    EventCoordinator.subscribeAfter("playerSpawn", handlePlayerSpawn);
    world.setDynamicProperty("lockdown_b", true);
}

/**
 * Stops the server lockdown module and unregisters event listeners.
 */
export function stopLockdown(): void {
    EventCoordinator.unsubscribeAfter("playerSpawn", handlePlayerSpawn);
    world.setDynamicProperty("lockdown_b", false);
}
