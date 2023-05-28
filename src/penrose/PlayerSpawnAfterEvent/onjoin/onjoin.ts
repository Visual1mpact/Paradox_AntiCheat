import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { onJoinData } from "../../../data/onjoindata.js";
import { getPrefix, setTimer } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

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

    // We execute each command in the list
    for (let i = 0; i < onJoinData.length; i++) {
        try {
            await player.runCommandAsync(`${onJoinData[i]}`);
        } catch (error) {}
    }

    // Set up custom prefix
    getPrefix(player);
}

const onJoin = () => {
    world.afterEvents.playerSpawn.subscribe(onJoinTime);
};

export { onJoin };
