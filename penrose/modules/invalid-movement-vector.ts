import { Player, system, GameMode } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/cache/player-cache";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Maximum allowed directional input magnitude on client-side vectors.
 * Standard movement vectors range from -1.0 to 1.0.
 */
const MAX_MOVE_VECTOR_BOUND = 1.001;

/**
 * In-memory state cache to prevent querying the database every tick.
 */
let isModuleEnabled = false;
let runIntervalId: number | null = null;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an Invalid Movement Vector occurs.
 */
function alertStaff(player: Player, moveVector: { x: number; y: number }): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "InvalidVector", `Player flagged for out-of-bounds MoveVector (X: ${moveVector.x.toFixed(3)}, Y: ${moveVector.y.toFixed(3)})`);
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvalidVector] §f${player.name} §7flagged for out-of-bounds MoveVector (X: ${moveVector.x.toFixed(3)}, Y: ${moveVector.y.toFixed(3)})`);
    }
}

/**
 * Synchronous tick check for invalid player movement vectors.
 */
function checkPlayerMoveVectors(): void {
    if (!isModuleEnabled) return;

    // Fast O(1) player lookup iterating cached player instances
    for (const player of PlayerCache.getPlayers()) {
        const gm = player.getGameMode();
        if (gm === GameMode.Spectator) continue;

        const input = player.inputInfo;
        if (!input) continue;

        const moveVector = input.getMovementVector(); // Returns Vector2 { x, y }

        /**
         * DETECTION LOGIC:
         * Checks if the X or Y component of the movement input vector exceeds
         * normal normalized bounds (-1.001 to 1.001).
         */
        if (Math.abs(moveVector.x) > MAX_MOVE_VECTOR_BOUND || Math.abs(moveVector.y) > MAX_MOVE_VECTOR_BOUND) {
            player.clearVelocity();
            alertStaff(player, moveVector);
        }
    }
}

/**
 * Loads the initial state from DB and starts the 1-tick check interval.
 */
export async function startInvalidMovementVectorCheck(): Promise<void> {
    // Sync initial state from DB
    const dbData = await paradoxModulesDB.get("invalidMovementVectorCheck_b");
    isModuleEnabled = dbData?.enabled ?? false;

    if (runIntervalId !== null) return;

    runIntervalId = system.runInterval(() => {
        checkPlayerMoveVectors();
    }, 1);
}

/**
 * Stops the Invalid Movement Vector detection module.
 */
export function stopInvalidMovementVectorCheck(): void {
    isModuleEnabled = false;
    if (runIntervalId !== null) {
        system.clearRun(runIntervalId);
        runIntervalId = null;
    }
}

/**
 * Helper to update the in-memory module state when toggled by a command.
 */
export function setInvalidMovementVectorState(enabled: boolean): void {
    isModuleEnabled = enabled;
}
