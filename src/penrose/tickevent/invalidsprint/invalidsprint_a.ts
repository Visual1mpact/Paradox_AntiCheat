import { world, MinecraftEffectTypes, system } from "@minecraft/server";
import { flag, isTimerExpired } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

let lastPosition: [number, number, number] = [0, 0, 0];
let lastTimestamp: number = Date.now();
let highestBps: number = 0;

function calculateMovementBPS(currentPosition: [number, number, number]): number {
    const currentTimestamp = Date.now();
    const timeElapsedInSeconds = (currentTimestamp - lastTimestamp) / 1000;

    const [dx, dy, dz] = [currentPosition[0] - lastPosition[0], currentPosition[1] - lastPosition[1], currentPosition[2] - lastPosition[2]];

    // Ignore purely vertical movement and downward vertical movement only
    if (dy <= 0 && Math.abs(dx) < Math.abs(dy) && Math.abs(dz) < Math.abs(dy)) {
        return 0;
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

function invalidsprinta(id: number) {
    // Get Dynamic Property
    const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");

    // Unsubscribe if disabled in-game
    if (invalidSprintABoolean === false) {
        system.clearRun(id);
        return;
    }
    // run as each player
    for (const player of world.getPlayers()) {
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
        const verifyTpGrace = isTimerExpired(player.name);
        // We compare with a 20% buffer to minimize false flags
        if (highestBps > config.modules.invalidsprintA.speed && player.getEffect(MinecraftEffectTypes.blindness) && verifyTpGrace === true) {
            flag(player, "InvalidSprint", "A", "Movement", null, null, "BlindSprint", highestBps.toFixed(2), true, null);
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
export function InvalidSprintA() {
    const invalidSprintAId = system.runInterval(() => {
        invalidsprinta(invalidSprintAId);
    }, 10);
}
