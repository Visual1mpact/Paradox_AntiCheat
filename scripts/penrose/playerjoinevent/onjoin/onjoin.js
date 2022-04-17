import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { onJoinData } from "../../../data/onjoindata.js";
import { disabler, getPrefix, getScore, tagRank } from "../../../util.js";

const World = world;

const tickEventCallback = World.events.tick;

// This is to allow passing between functions
let player;

function onJoinTime() {
    try {
        // Loop until player is detected in the world
        player.runCommand(`testfor @a[name=${disabler(player.nameTag)}]`);

        // Lock down the server if enabled
        if (config.modules.lockDown.enabled) {
            let reason = "Under Maintenance! Sorry for the inconvenience.";
            try {
                // Kick players from server
                player.runCommand(`kick "${disabler(player.nameTag)}" ${reason}`);
            } catch (error) {
                // Despawn players from server
                player.triggerEvent('paradox:kick');
            }
            return tickEventCallback.unsubscribe(onJoinTime);
        }

        // We execute each command in the list
        for (let i=0; i < onJoinData.length; i++) {
            try {
                player.runCommand(`${onJoinData[i]}`);
            } catch (error) {}
        }
        // Set up custom tag
        // tagRank(player);
        // Set up custom prefix
        getPrefix(player);
        player.check = true;

        // Let's verify if this is enabled globally
        let worldborder = getScore('worldborder', player);
        // Enable worldborder for this player if active
        if (worldborder <= 0) {
            config.modules.worldBorder.enabled = false;
        }
    } catch (error) {}
    if (player.check) {
        player.check = false;
        return tickEventCallback.unsubscribe(onJoinTime);
    }
}

const onJoin = () => {
    World.events.playerJoin.subscribe(loaded => {
        // Get the name of the player who is joining
        player = loaded.player;
        // Subscribe tick event to the time function
        tickEventCallback.subscribe(onJoinTime);
    });
};

export { onJoin };