import { world, system, PlayerLeaveAfterEvent, Vector3, Player } from "@minecraft/server";

let currentRunId: number | null = null;
let playerLeaveCallback: (arg: PlayerLeaveAfterEvent) => void;

// Initial AFK time in ticks; this will be updated based on the user's input.
let AFK_TIME_TICKS = 12000; // Default: 10 minutes in ticks (20 ticks per second * 60 seconds * 10 minutes)

const playerLastActive: { [playerId: string]: number } = {};
const VELOCITY_THRESHOLD = 0.01; // Threshold for detecting movement

/**
 * Converts hours, minutes, and seconds to ticks.
 *
 * @param {number} hours - The number of hours.
 * @param {number} minutes - The number of minutes.
 * @param {number} seconds - The number of seconds.
 * @returns {number} - The equivalent number of ticks.
 */
function convertToTicks(hours: number, minutes: number, seconds: number): number {
    return (hours * 3600 + minutes * 60 + seconds) * 20; // 20 ticks per second
}

/**
 * Determines if a player is AFK based on their velocity.
 *
 * @param {Vector3} velocity - The velocity of the player.
 * @returns {boolean} - True if the player's velocity is below the threshold, indicating they are AFK.
 */
function isPlayerAFK(velocity: Vector3): boolean {
    return Math.abs(velocity.x) < VELOCITY_THRESHOLD && Math.abs(velocity.y) < VELOCITY_THRESHOLD && Math.abs(velocity.z) < VELOCITY_THRESHOLD;
}

/**
 * Checks if a player's security clearance should be ignored for AFK checking.
 *
 * @param {Player} player - The player to check.
 * @returns {boolean} - True if the player's security clearance is 4 (ignore AFK status).
 */
function isSecurityClearanceIgnored(player: Player): boolean {
    const clearance = player && (player.getDynamicProperty("securityClearance") as number);
    return clearance === 4;
}

/**
 * Updates the last active tick for a player.
 *
 * @param {string} playerId - The ID of the player.
 */
async function updatePlayerActivity(playerId: string): Promise<void> {
    playerLastActive[playerId] = system.currentTick;
}

/**
 * Checks the AFK status of all players.
 * Kicks players who have been AFK longer than the configured time.
 */
async function checkAFKStatus(): Promise<void> {
    const currentTick = system.currentTick;

    for (const [playerId, lastActiveTick] of Object.entries(playerLastActive)) {
        const player = world.getPlayers().find((p) => p.id === playerId);
        if (player && !isSecurityClearanceIgnored(player)) {
            if (currentTick - lastActiveTick >= AFK_TIME_TICKS) {
                world.getDimension(player.dimension.id).runCommand(`kick "${player.name}" \n\n§l§o§7You have been kicked for being AFK!`);
                delete playerLastActive[playerId];
            }
        }
    }
}

/**
 * Monitors all players, checking their movement status and updating activity.
 */
async function monitorPlayers(): Promise<void> {
    const players = world.getPlayers();

    for (const player of players) {
        const velocity = player.getVelocity();

        // Update only if the player is moving and should not be ignored
        if (!isSecurityClearanceIgnored(player) && (!playerLastActive[player.id] || !isPlayerAFK(velocity))) {
            await updatePlayerActivity(player.id);
        }
    }
}

/**
 * Handles player logout events by removing them from the activity tracking.
 *
 * @param {PlayerLeaveAfterEvent} event - The player leave event.
 */
function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    delete playerLastActive[event.playerId];
}

/**
 * Starts the AFK checker. Sets the AFK time and interval for checking.
 *
 * @param {number} [hours=0] - The number of hours before a player is considered AFK.
 * @param {number} [minutes=10] - The number of minutes before a player is considered AFK.
 * @param {number} [seconds=0] - The number of seconds before a player is considered AFK.
 */
export function startAFKChecker(hours: number = 0, minutes: number = 10, seconds: number = 0): void {
    // If an AFK checker is already running, clear it
    if (currentRunId !== null) {
        world.afterEvents.playerLeave.unsubscribe(playerLeaveCallback);
        system.clearRun(currentRunId);
        currentRunId = null;
    }

    // Set the new AFK time
    AFK_TIME_TICKS = convertToTicks(hours, minutes, seconds);

    // Set up the player leave callback
    playerLeaveCallback = (event: PlayerLeaveAfterEvent) => onPlayerLogout(event);
    world.afterEvents.playerLeave.subscribe(playerLeaveCallback);

    let isRunning = false;
    let runIdBackup: number | null = null;

    currentRunId = system.runInterval(async () => {
        if (isRunning) {
            // Restore the backup runId if an overlap is detected
            system.clearRun(currentRunId);
            currentRunId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        runIdBackup = currentRunId;
        isRunning = true;

        await monitorPlayers();
        await checkAFKStatus();
        isRunning = false;
    }, 100); // Check every 5 seconds (100 ticks)
}

/**
 * Stops the AFK checker by clearing the interval and unsubscribing from the playerLeave event.
 */
export function stopAFKChecker(): void {
    if (currentRunId !== null) {
        system.clearRun(currentRunId);
        currentRunId = null;
    }

    if (playerLeaveCallback) {
        world.afterEvents.playerLeave.unsubscribe(playerLeaveCallback);
        playerLeaveCallback = undefined;
    }
}
