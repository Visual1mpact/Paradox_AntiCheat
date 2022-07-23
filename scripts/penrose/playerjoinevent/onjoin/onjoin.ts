import { Player, world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { onJoinData } from "../../../data/onjoindata.js";
import { getPrefix } from "../../../util.js";

const World = world;

const tickEventCallback = World.events.tick;

let check = false;

function onJoinTime(player: Player, callback: any) {
    // Get Dynamic Property
    let lockdownBoolean = World.getDynamicProperty('lockdown_b');
    if (lockdownBoolean === undefined) {
        lockdownBoolean = config.modules.lockDown.enabled;
    }
    // Get Dynamic Property
    let illegalItemsABoolean = World.getDynamicProperty('illegalitemsa_b');
    if (illegalItemsABoolean === undefined) {
        illegalItemsABoolean = config.modules.illegalitemsA.enabled;
    }

    try {
        // Loop until player is detected in the world
        player.runCommand(`testfor @s`);

        // Lock down the server if enabled
        if (lockdownBoolean) {
            let reason = "Under Maintenance! Sorry for the inconvenience.";
            try {
                // Kick players from server
                player.runCommand(`kick ${JSON.stringify(player.name)} ${reason}`);
            } catch (error) {
                // Despawn players from server
                player.triggerEvent('paradox:kick');
            }
            return tickEventCallback.unsubscribe(callback);
        }

        // We execute each command in the list
        for (let i = 0; i < onJoinData.length; i++) {
            try {
                player.runCommand(`${onJoinData[i]}`);
            } catch (error) { }
        }

        // Unsubscribe if disabled in-game
        if (illegalItemsABoolean === false) {
            let allPlayers = [...World.getPlayers()];
            for (let player of allPlayers) {
                if (player.hasTag('illegalitemsA')) {
                    player.removeTag('illegalitemsA');
                }
            }
        }

        // Set up custom tag
        // tagRank(player);
        // Set up custom prefix
        getPrefix(player);
        check = true;

    } catch (error) { }
    if (check) {
        check = false;
        return tickEventCallback.unsubscribe(callback);
    }
}

const onJoin = () => {
    World.events.playerJoin.subscribe(loaded => {
        // Get the name of the player who is joining
        let player = loaded.player;
        let callback: any;
        // Subscribe tick event to the time function
        tickEventCallback.subscribe(callback = () => onJoinTime(player, callback));
    });
};

export { onJoin };