import { world, system, EntityQueryOptions, GameMode } from "@minecraft/server";
import config from "../../../data/config.js";
import { flag, isTimerExpired, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

// Create a Map to store each player's last known position, timestamp, and highest speed
const playerData = new Map<string, { lastPosition: number[]; lastTimestamp: number; highestBps: number }>();

function calculateMovementBPS(currentPosition: number[], lastPosition: number[], playerTimestamp: number, lastTimestamp: number): number {
    const timeElapsedInSeconds = (playerTimestamp - lastTimestamp) / 1000;

    const [dx, dy, dz] = [currentPosition[0] - lastPosition[0], currentPosition[1] - lastPosition[1], currentPosition[2] - lastPosition[2]];

    // Ignore purely vertical movement and downward vertical movement only
    if (dy <= 0 && Math.abs(dx) < Math.abs(dy) && Math.abs(dz) < Math.abs(dy)) {
        return 0;
    }

    // Calculate distance moved (ignoring vertical movement)
    const distanceMoved = Math.sqrt(dx * dx + dz * dz);

    // Calculate speed
    const bps = distanceMoved / timeElapsedInSeconds;

    return bps;
}

function noslowa(id: number) {
    // Get Dynamic Property
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");

    // Unsubscribe if disabled in-game
    if (noSlowBoolean === false) {
        playerData.clear();
        system.clearRun(id);
        return;
    }

    const filter = new Object() as EntityQueryOptions;
    // Exclude creative mode and spectator mode
    filter.excludeGameModes = [GameMode.creative, GameMode.spectator];
    for (const player of world.getPlayers(filter)) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const glideCheck = player.hasTag("gliding");
        if (glideCheck) {
            continue;
        }

        const rideCheck = player.hasTag("riding");
        if (rideCheck) {
            continue;
        }

        const playerName = player.name;
        const playerPosition = [player.location.x, player.location.y, player.location.z];
        const playerTimestamp = Date.now();

        // If playerData Map doesn't have a key for the player's name, add it with initial values
        if (!playerData.has(playerName)) {
            playerData.set(playerName, { lastPosition: playerPosition, lastTimestamp: playerTimestamp, highestBps: 0 });
        }

        /**
         * startTimer will make sure the key is properly removed
         * when the time for theVoid has expired. This will preserve
         * the integrity of our Memory.
         */
        const timerExpired = startTimer("noslowa", player.name, Date.now());
        if (timerExpired.namespace.indexOf("noslowa") !== -1 && timerExpired.expired) {
            const deletedKey = timerExpired.key; // extract the key without the namespace prefix
            playerData.delete(deletedKey);
        }

        const playerInfo = playerData.get(playerName);
        const { lastPosition, lastTimestamp, highestBps } = playerInfo;
        const bps = calculateMovementBPS(playerPosition, lastPosition, playerTimestamp, lastTimestamp);
        playerInfo.lastPosition = playerPosition;
        playerInfo.lastTimestamp = playerTimestamp;
        playerInfo.highestBps = Math.max(bps, highestBps);

        const verifyTpGrace = isTimerExpired(playerName);
        // We compare with a 20% buffer to minimize false flags
        if (bps > config.modules.noslowA.speed && verifyTpGrace === true) {
            flag(player, "NoSlow", "A", "Movement", null, null, "IllegalSpeed", playerInfo.highestBps.toFixed(2), true, null);
            playerInfo.highestBps = 0;
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function NoSlowA() {
    const noSlowAId = system.runInterval(() => {
        noslowa(noSlowAId);
    }, 10);
}
