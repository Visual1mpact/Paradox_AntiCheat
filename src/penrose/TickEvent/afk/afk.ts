import { PlayerJoinAfterEvent, PlayerLeaveAfterEvent, system, world, Vector3 } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry";
import config from "../../../data/config";

const inactiveThreshold = config.modules.afk.minutes * 60 * 1000; // minutes in milliseconds
const playerActivityMap: Map<string, number> = new Map(); // Map to store player activity timestamps

// Function to check for AFK players and remove them
function checkAndRemoveAFKPlayers(id: number) {
    // Get Dynamic Property
    const afkBoolean = dynamicPropertyRegistry.get("afk_b");

    // Unsubscribe if disabled in-game
    if (!afkBoolean) {
        system.clearRun(id);
        return;
    }

    const currentTime = Date.now();
    const onlinePlayers = world.getPlayers();

    for (const player of onlinePlayers) {
        // Get the player's unique ID from the "dynamicPropertyRegistry" object
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // If the player has permission (i.e., their unique ID matches their name), skip to the next player
        if (uniqueId === player.name) {
            continue;
        }

        const velocity = player.getVelocity();

        const lastActivityTime = playerActivityMap.get(player.id); // Get the last activity time for the player

        // Calculate the accumulated time since the last activity
        const accumulatedTime = currentTime - lastActivityTime;

        // Define the tolerance percentage (10% in this case)
        const tolerancePercentage = 0.1;

        // Calculate the lower bound for the 10 percent tolerance
        const lowerBound = Math.max(inactiveThreshold - inactiveThreshold * tolerancePercentage, 0);

        if (isPlayerAFK(velocity) && lastActivityTime && accumulatedTime > lowerBound) {
            const kickMessage = "You were kicked for being AFK!";
            player.runCommandAsync(`kick ${JSON.stringify(player.name)} §r\n\n${kickMessage}`);
        } else {
            // Update player activity timestamp if the player is active
            updatePlayerActivity(player.id);
        }
    }
}

// Function to update player activity timestamp more frequently
function updatePlayerActivityFrequently(id: number) {
    // Get Dynamic Property
    const afkBoolean = dynamicPropertyRegistry.get("afk_b");

    // Unsubscribe if disabled in-game
    if (!afkBoolean) {
        playerActivityMap.clear();
        system.clearRun(id);
        return;
    }

    const onlinePlayers = world.getPlayers();
    for (const player of onlinePlayers) {
        updatePlayerActivity(player.id);
    }
}

// Function to update player activity timestamp
function updatePlayerActivity(playerName: string) {
    const currentTime = Date.now();
    playerActivityMap.set(playerName, currentTime);
}

// Function to check if the player is AFK based on their velocity
function isPlayerAFK(velocity: Vector3): boolean {
    return velocity.x === 0 && velocity.y === 0 && velocity.z === 0;
}

/**
 * Event handler for player login
 */
function onPlayerLogin(event: PlayerJoinAfterEvent) {
    updatePlayerActivity(event.playerId);
}

/**
 * Event handler for player logout
 */
function onPlayerLogout(event: PlayerLeaveAfterEvent) {
    // Remove the player's data from the map when they log off
    playerActivityMap.delete(event.playerId);
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function AFK() {
    const afkCheckIntervalTicks = config.modules.afk.minutes * 60 * 20;

    // Subscribe to player login and logout events
    world.afterEvents.playerJoin.subscribe(onPlayerLogin);
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);

    // Initialize player activity timestamps for online players when the script starts
    const onlinePlayers = world.getPlayers();
    for (const player of onlinePlayers) {
        updatePlayerActivity(player.id);
    }

    // Start the timer to check for AFK players at regular intervals
    const checkAfkIntervalId = system.runInterval(() => {
        checkAndRemoveAFKPlayers(checkAfkIntervalId);
    }, afkCheckIntervalTicks); // Check every minute

    // Start the timer to update player activity more frequently
    const updateActivityIntervalId = system.runInterval(() => {
        updatePlayerActivityFrequently(updateActivityIntervalId);
    }, 20); // Update every second
}
