import { EntityQueryOptions, Player, PlayerSpawnEvent, world } from "@minecraft/server";
import { onJoinData } from "../../../data/onjoindata.js";
import { getPrefix, setTimer } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

async function onJoinTime(object: PlayerSpawnEvent) {
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

    const hasTagPlayers = world.getPlayers({ tags: ["illegalitemsA"] });
    const noHasTagPlayers = world.getPlayers({ excludeTags: ["illegalitemsA"] });
    // Unsubscribe if disabled in-game
    if (illegalItemsABoolean === false && hasTagPlayers.length > 0) {
        for (const player of hasTagPlayers) {
            player.removeTag("illegalitemsA");
        }
    } else if (illegalItemsABoolean === true && noHasTagPlayers.length > 0) {
        for (const player of noHasTagPlayers) {
            player.addTag("illegalitemsA");
        }
    }

    // Set up custom prefix
    getPrefix(player);
}

const onJoin = () => {
    world.events.playerSpawn.subscribe(onJoinTime);
};

export { onJoin };
