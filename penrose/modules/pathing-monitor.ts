import { system, Player, PlayerLeaveAfterEvent, Vector3, GameMode } from "@minecraft/server";
import { PlayerCache } from "../classes/player-cache";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * Movement constants for Bedrock Edition.
 * Sprinting is ~0.28 blocks/tick. Speed II is ~0.35 blocks/tick.
 */
const MAX_EXPECTED_SPEED = 0.4;
const ROTATION_PRECISION_THRESHOLD = 0.00001;
const MIN_MOVEMENT_FOR_CHECK = 0.1;

interface PathingData {
    lastLocation: Vector3;
    lastYaw: number;
    speedViolations: number;
    precisionTicks: number;
}

const playerData = new Map<string, PathingData>();
let monitorIntervalId: number | undefined;
let pathingJobId: number | null = null;

/** Reference to the player leave event subscription */
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Detects artifacts produced by Auto-Navigation scripts:
 * 1. Constant yaw precision (robotic snapping).
 * 2. Speeds exceeding the vanilla horizontal limit.
 */
function checkPathing(player: Player) {
    if (player.getGameMode() === GameMode.Creative || player.getGameMode() === GameMode.Spectator) return;
    if ((player.getDynamicProperty("securityClearance") as number) === 4) return;

    // Ignore if player is using movement-altering mechanics
    if (player.isGliding || player.isInWater || player.isClimbing) return;

    const currentLoc = player.location;
    const currentYaw = player.getRotation().y;
    let data = playerData.get(player.id);

    if (!data) {
        playerData.set(player.id, {
            lastLocation: currentLoc,
            lastYaw: currentYaw,
            speedViolations: 0,
            precisionTicks: 0,
        });
        return;
    }

    const dx = currentLoc.x - data.lastLocation.x;
    const dz = currentLoc.z - data.lastLocation.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // 1. SPEED DETECTION
    // The Navigator script uses speeds up to 0.6+ while sprinting is ~0.28
    if (horizontalDist > MAX_EXPECTED_SPEED) {
        data.speedViolations++;
        if (data.speedViolations > 5) {
            flagPlayer(player, "Illegal Movement Speed (Navigator)");
            data.speedViolations = 0;
        }
    } else {
        data.speedViolations = Math.max(0, data.speedViolations - 0.1);
    }

    // 2. ROTATION PRECISION DETECTION
    // Human yaw fluctuates during movement. Navigator snaps to a fixed float.
    if (horizontalDist > MIN_MOVEMENT_FOR_CHECK) {
        const yawDelta = Math.abs(currentYaw - data.lastYaw);

        // If yaw is perfectly constant while moving at significant speed
        if (yawDelta < ROTATION_PRECISION_THRESHOLD) {
            data.precisionTicks++;
        } else {
            data.precisionTicks = Math.max(0, data.precisionTicks - 2);
        }

        if (data.precisionTicks > 40) {
            // ~2 seconds of perfectly frozen yaw while moving
            flagPlayer(player, "Robotic Pathing Signature");
            data.precisionTicks = 0;
        }
    }

    data.lastLocation = currentLoc;
    data.lastYaw = currentYaw;
}

/**
 * Alerts staff and mitigates the movement.
 */
function flagPlayer(player: Player, reason: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Pathing] §f${player.name} §7flagged: §c${reason}`);
    }

    // Mitigation: Reset velocity to stop the navigator loop
    const data = playerData.get(player.id);
    if (data) {
        player.teleport(data.lastLocation, { checkForBlocks: true });
    }
}

/**
 * Cleanup logic for departing players.
 */
function handleLeave(event: PlayerLeaveAfterEvent) {
    playerData.delete(event.playerId);
}

/**
 * Generator that iterates over players to analyze pathing signatures.
 */
function* pathingCheckGenerator(): Generator<void, void, unknown> {
    for (const player of PlayerCache.getPlayers()) {
        if (player.isValid) {
            try {
                checkPathing(player);
            } catch (e) {
                // Handle dimension loading edge cases
            }
        }
        yield;
    }
}

/**
 * Executes the pathing check as a background job.
 */
async function executePathingCheck(): Promise<void> {
    if (pathingJobId !== null) return;

    await new Promise<void>((resolve) => {
        function* runner() {
            try {
                yield* pathingCheckGenerator();
            } finally {
                pathingJobId = null;
                resolve();
            }
        }
        pathingJobId = system.runJob(runner());
    });
}

/**
 * Starts the Pathing/Navigator monitor.
 */
export function startPathingMonitor() {
    if (monitorIntervalId) return;

    playerLeaveSubscription = handleLeave;
    EventCoordinator.subscribeAfter("playerLeave", playerLeaveSubscription);

    let isRunning = false;
    let runIdBackup: number | undefined;

    monitorIntervalId = system.runInterval(async () => {
        if (paradoxModulesDB.get("pathingCheck_b")?.enabled === false) {
            stopPathingMonitor();
            return;
        }

        if (isRunning) {
            system.clearRun(monitorIntervalId as number);
            monitorIntervalId = runIdBackup;
            return;
        }

        runIdBackup = monitorIntervalId;
        isRunning = true;
        await executePathingCheck();
        isRunning = false;
    }, 1);
}

/**
 * Stops the Pathing/Navigator monitor.
 */
export function stopPathingMonitor() {
    if (monitorIntervalId !== undefined) {
        system.clearRun(monitorIntervalId);
        monitorIntervalId = undefined;
    }

    if (playerLeaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    if (pathingJobId !== null) {
        system.clearJob(pathingJobId);
        pathingJobId = null;
    }

    playerData.clear();
}
