import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { onJoinPrimaryData, onJoinSecondaryData } from "../../../data/onjoindata.js";
import { getPrefix, setTimer } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { ScoreManager } from "../../../classes/ScoreManager.js";

async function onJoinTime(object: PlayerSpawnAfterEvent) {
    /**
     * This is to give the player a grace period
     * in case they previously died and spawned again
     */
    setTimer(object.player.id, true);

    /**
     * We only want to execute this when it's a players initial spawn
     */
    let player: Player;
    if (object.initialSpawn === true) {
        player = object.player;
    } else {
        return;
    }

    // Get Dynamic Property
    const lockdownBoolean = dynamicPropertyRegistry.get("lockdown_b");

    // Lock down the server if enabled
    if (lockdownBoolean) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        if (uniqueId === player.name) {
            return;
        }

        const reason = "Under Maintenance! Sorry for the inconvenience.";

        // Kick players from server
        player.runCommandAsync(`kick "${player.name}" §f\n\n${reason}`).catch(() => {
            // Despawn players from server
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
        return;
    }

    // We execute each command in the list
    for (let i = 0; i < onJoinPrimaryData.length; i++) {
        // Create the objective
        const verifyObjective = world.scoreboard.getObjective(onJoinPrimaryData[i]);
        if (!verifyObjective) {
            world.scoreboard.addObjective(onJoinPrimaryData[i], onJoinPrimaryData[i]);
            ScoreManager.setScore(player, onJoinPrimaryData[i], 0, true);
        }
    }

    // We execute each command in the list
    for (let i = 0; i < onJoinSecondaryData.length; i++) {
        player.runCommandAsync(`${onJoinSecondaryData[i]}`).catch(() => {
            // Certain things like "ability" will cause errors if not enabled properly.
            // We ignore those errors since they are expected and have no impact.
        });
    }

    // Set up custom prefix
    getPrefix(player);
}

const onJoin = () => {
    world.afterEvents.playerSpawn.subscribe((object) => {
        onJoinTime(object).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    });
};

export { onJoin };
