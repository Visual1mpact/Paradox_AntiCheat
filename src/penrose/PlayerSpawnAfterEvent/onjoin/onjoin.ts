import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { onJoinPrimaryData, onJoinSecondaryData } from "../../../data/onjoindata.js";
import { getPrefix, setScore, setTimer } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import config from "../../../data/config.js";

async function onJoinTime(object: PlayerSpawnAfterEvent) {
    /**
     * This is to give the player a grace period
     * in case they previously died and spawned again
     */
    setTimer(object.player.name, true);

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
        const reason = "Under Maintenance! Sorry for the inconvenience.";
        try {
            // Kick players from server
            await player.runCommandAsync(`kick ${JSON.stringify(player.name)} ${reason}`);
        } catch (error) {
            // Despawn players from server
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
        return;
    }

    const verify = player.hasTag("paradoxConfirmed");
    // We execute each command in the list
    for (let i = 0; i < onJoinPrimaryData.length; i++) {
        if (!verify) {
            // Remove the player from the objective first
            try {
                player.scoreboardIdentity.removeFromObjective(world.scoreboard.getObjective(onJoinPrimaryData[i]));
            } catch (error) {
                // If the objective does not exist then this is ok
                if (config.debug) {
                    console.log(error);
                }
            }
            // Remove the objective from the world second
            try {
                world.scoreboard.removeObjective(onJoinPrimaryData[i]);
            } catch (error) {
                // If the objective does not exist then this is ok
                if (config.debug) {
                    console.log(error);
                }
            }
        }
        // Create the objective
        world.scoreboard.addObjective(onJoinPrimaryData[i], onJoinPrimaryData[i]);

        if (!verify) {
            /**
             * After the objective object is created we now set the score to 0 for the player.
             * This will make the player a participant of this objective so we can safely
             * detect, set, or get their score.
             */
            player.scoreboardIdentity.setScore(world.scoreboard.getObjective(onJoinPrimaryData[i]), 0);
            continue;
        } else {
            setScore(player, onJoinPrimaryData[i], 0, true);
        }
    }
    /**
     * We tag them here to prevent redundant execution with future joins
     *
     * This is temporary and will probably remain here between multiple versions
     * to ensure that players are cleared of these and to prevent errors. When the
     * time feels right this will be cleaned up and removed as it won't be required
     * at that time. This is the price to take when transitioning.
     *
     * REMOVE CODE IN THE FUTURE:
     * 1. Removing player from the objective
     * 2. Removing the objective from the world
     * 3. Only verify the tag "paradoxConfirmed" to remove it then remove that code on a release afterwards
     *
     * The only thing we should be doing by that point in time is adding the objective to the world.
     * Setting a score for the player of that objective to make them a participant using the setScore function.
     */
    player.addTag("paradoxConfirmed");

    // We execute each command in the list
    for (let i = 0; i < onJoinSecondaryData.length; i++) {
        try {
            await player.runCommandAsync(`${onJoinSecondaryData[i]}`);
        } catch {}
    }

    // Set up custom prefix
    getPrefix(player);
}

const onJoin = () => {
    world.afterEvents.playerSpawn.subscribe(onJoinTime);
};

export { onJoin };
