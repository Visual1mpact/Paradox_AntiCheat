import * as Minecraft from "mojang-minecraft";
import { onJoinData2 } from "../../../data/onjoindata2.js";

const World = Minecraft.world;

const tickEventCallback = World.events.tick;

// This is to allow passing between functions
let player;

// This function will be called when tick event is triggered from the onJoin2 function
function time() {
    try {
        // We loop testfor until it returns true so we know the
        // player is in the world because playerJoin triggers
        // too quickly while player is in loading screen
        player.runCommand(`testfor @a[name="${player.name}"]`);
        try {
            // We execute each command in the list
            onJoinData2.forEach(list => {
                player.runCommand(`${list}`);
            })
            tickEventCallback.unsubscribe(time)
        } catch (error) {}

    } catch (error) {}
}

// This function will be called when playerJoin event is triggered
function onJoin2(loaded) {
    // Get the name of the player who is joining
    player = loaded.player;
    // Subscribe tick event to the time function
    tickEventCallback.subscribe(time)
}

export { onJoin2 }