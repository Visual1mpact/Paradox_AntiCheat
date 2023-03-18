import { world, system, EntityQueryOptions, GameMode } from "@minecraft/server";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

let lastPosition: [number, number, number] = [0, 0, 0];
let lastTimestamp: number = Date.now();
let highestBps: number = 0;

function calculateMovementBPS(currentPosition: [number, number, number]): number {
    const currentTimestamp = Date.now();
    const timeElapsedInSeconds = (currentTimestamp - lastTimestamp) / 1000;

    const [dx, dy, dz] = [currentPosition[0] - lastPosition[0], currentPosition[1] - lastPosition[1], currentPosition[2] - lastPosition[2]];

    // Ignore purely vertical movement and downward vertical movement only
    if (dy < 0 && dx === 0 && dz === 0) {
        return highestBps;
    }

    // Calculate distance moved (ignoring vertical movement)
    const distanceMoved = Math.sqrt(dx * dx + dz * dz);

    // Calculate speed
    const bps = distanceMoved / timeElapsedInSeconds;

    // Update last position and timestamp
    lastPosition = currentPosition;
    lastTimestamp = currentTimestamp;

    // Update highest speed
    if (bps > highestBps) {
        highestBps = bps;
    }

    return highestBps;
}

function noslowa(id: number) {
    // Get Dynamic Property
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");

    // Unsubscribe if disabled in-game
    if (noSlowBoolean === false) {
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

        const { x, y, z } = player.location;
        highestBps = calculateMovementBPS([x, y, z]);
        player.onScreenDisplay.setActionBar(String(highestBps));
        // We compare with a 20% buffer to minimize false flags
        if (highestBps > config.modules.noslowA.speed) {
            flag(player, "NoSlow", "A", "Movement", null, null, "IllegalSpeed", highestBps.toFixed(2), true, null);
            highestBps = 0;
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
