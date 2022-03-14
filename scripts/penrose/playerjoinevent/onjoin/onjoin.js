import * as Minecraft from "mojang-minecraft";
import { onJoinData } from "../../../data/onjoindata.js";
import { disabler, getPrefix, tagRank } from "../../../util.js";

const World = Minecraft.world;

const tickEventCallback = World.events.tick;

// This is to allow passing between functions
let player;

function onJoinTime() {
    try {
        // Loop until player is detected in the world
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}"]`);
        // We execute each command in the list
        for (let i=0; i < onJoinData.length; i++) {
            try {
                player.runCommand(`${onJoinData[i]}`);
            } catch (error) {}
        }
        // Set up custom tag
        tagRank(player);
        // Set up custom prefix
        getPrefix(player);
        player.check = true;
    } catch (error) {}
    if (player.check) {
        player.check = false;
        tickEventCallback.unsubscribe(onJoinTime);
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