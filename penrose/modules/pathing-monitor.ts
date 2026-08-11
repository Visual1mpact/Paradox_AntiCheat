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

interface PathingModuleConfig {
    enabled?: boolean;
}

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

const playerData = new Map<string, PathingData>();

/** Reference to the player leave event subscription */
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | undefined;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a pathing violation occurs.
 *
 * @param {Player} player - The player triggering the pathing alert.
 * @param {string} reason - The reason for the pathing violation.
 */
function alertStaff(player: Player, reason: string): void {
    const staff = getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Pathing] §f${player.name} §7flagged: §c${reason}`);
    }
}

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
    alertStaff(player, reason);

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
 * Continuous generator loop that iterates over players to analyze pathing signatures.
 */
function* continuousPathingLoop(moduleConfig: PathingModuleConfig | undefined): Generator<void, void, void> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        // Check pre-fetched module status without using inline promises inside the generator
        const isEnabled = moduleConfig?.enabled ?? false;
        if (!isEnabled) return;

        const players = PlayerCache.getPlayers();

        for (const player of players) {
            const isValid = player.isValid;
            if (!isValid) continue;

            try {
                checkPathing(player);
            } catch (e) {
                // Handle dimension loading edge cases smoothly
            }

            // Yield execution control back to the engine tick scheduler
            yield;
        }
    } finally {
        // Unlock job state for the current pass
        isJobActive = false;

        // Recursively queue the next pass for the next available frame
        if (isModuleActive) {
            system.run(async () => {
                // Pre-fetch DB state outside generator on the loop continuation pass
                const nextConfig = (await paradoxModulesDB.get("pathingCheck_b")) as PathingModuleConfig | undefined;
                system.runJob(continuousPathingLoop(nextConfig));
            });
        }
    }
}

/**
 * Starts the Pathing/Navigator monitor.
 */
export async function startPathingMonitor(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = handleLeave;
        EventCoordinator.subscribeAfter("playerLeave", playerLeaveSubscription);
    }

    if (!isJobActive) {
        try {
            // Await initial database fetch before spawning the generator job
            const initialConfig = (await paradoxModulesDB.get("pathingCheck_b")) as PathingModuleConfig | undefined;

            // Guard against module stopping while the database call was pending
            if (!isModuleActive) return;

            system.runJob(continuousPathingLoop(initialConfig));
        } catch (e) {
            console.error(`[Paradox] Failed to load config for pathing check: ${e}`);
            isModuleActive = false;
        }
    }
}

/**
 * Stops the Pathing/Navigator monitor.
 */
export function stopPathingMonitor() {
    isModuleActive = false;

    if (playerLeaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    playerData.clear();
}
