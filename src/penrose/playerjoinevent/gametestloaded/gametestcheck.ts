import { Player, world } from "@minecraft/server";

const World = world;

const tickEventCallback = World.events.tick;

// This is to allow passing between functions
let player: Player;
let isChecked = false;

// This function will be called when tick event is triggered from the playerloaded function
function time() {
    try {
        // We loop testfor until it returns true so we know the
        // player is in the world because playerJoin triggers
        // too quickly while player is in loading screen
        player.runCommand(`testfor @s`);
        try {
            // (1..) Set gametestapi to 1
            player.runCommand(`scoreboard players set paradox:config gametestapi 1`);
            player.runCommand(`scoreboard players operation @a gametestapi = paradox:config gametestapi`);
            isChecked = true;
            tickEventCallback.unsubscribe(time);
        } catch (error) {}
    } catch (error) {}
}

// This function will be called when playerJoin event is triggered
const GametestCheck = () => {
    World.events.playerJoin.subscribe((loaded) => {
        if (isChecked === false) {
            // Get the name of the player who is joining
            player = loaded.player;
            // Subscribe tick event to the time function
            tickEventCallback.subscribe(time);
        }
    });
};

export { GametestCheck };
