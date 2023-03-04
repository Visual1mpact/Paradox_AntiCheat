import { Player, PlayerSpawnEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { onJoinData } from "../../../data/onjoindata.js";
import { getPrefix } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

async function onJoinTime(object: PlayerSpawnEvent) {
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

    // Get Dynamic Property
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");

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

    // Unsubscribe if disabled in-game
    if (illegalItemsABoolean === false) {
        const allPlayers = [...World.getPlayers()];
        for (const player of allPlayers) {
            if (player.hasTag("illegalitemsA")) {
                player.removeTag("illegalitemsA");
            }
        }
    }

    // Set up custom tag
    // tagRank(player);
    // Set up custom prefix
    getPrefix(player);
}

const onJoin = () => {
    World.events.playerSpawn.subscribe(onJoinTime);
};

export { onJoin };
