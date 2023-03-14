import { world, MinecraftEffectTypes, system, Vector } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

let lastPosition: [number, number, number] = [0, 0, 0];
let lastTimestamp: number = Date.now();
let highestBps: number = 0;

function calculateMovementBPS(currentPosition: [number, number, number]): number {
    const currentTimestamp = Date.now();
    const timeElapsedInSeconds = (currentTimestamp - lastTimestamp) / 500;

    const [dx, dy, dz] = [currentPosition[0] - lastPosition[0], currentPosition[1] - lastPosition[1], currentPosition[2] - lastPosition[2]];

    // We only want to focus on moves in any direction other than purely vertically
    if (dx === 0 && dz === 0 && dy !== 0) {
        // Player moved only vertically, return 0;
        return 0;
    }

    const distanceMovedSquared = dx * dx + dy * dy + dz * dz;
    const bps = distanceMovedSquared / (timeElapsedInSeconds * timeElapsedInSeconds);

    if (bps > highestBps) {
        highestBps = bps;
    }

    lastPosition[0] = currentPosition[0];
    lastPosition[1] = currentPosition[1];
    lastPosition[2] = currentPosition[2];
    lastTimestamp = currentTimestamp;

    return highestBps;
}

function invalidsprinta(id: number) {
    // Get Dynamic Property
    const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");

    // Unsubscribe if disabled in-game
    if (invalidSprintABoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of world.getPlayers()) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }
        const { x, y, z } = player.location;
        highestBps = calculateMovementBPS([x, y, z]);
        // We compare with a 20% buffer to minimize false flags
        if (highestBps > config.modules.invalidsprintA.speed && player.getEffect(MinecraftEffectTypes.blindness)) {
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
    const invalidSprintAId = system.runSchedule(() => {
        invalidsprinta(invalidSprintAId);
    }, 10);
}
