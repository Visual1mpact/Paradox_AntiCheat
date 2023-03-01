import { Player, world, PlayerSpawnEvent } from "@minecraft/server";

const World = world;

// This function will be called when tick event is triggered from the playerloaded function
async function gametestcheck(object: PlayerSpawnEvent) {
    /**
     * We only want to execute this when it's a players initial spawn
     */
    let player: Player;
    if (object.initialSpawn === true) {
        player = object.player;
    } else {
        return;
    }

    try {
        // (1..) Set gametestapi to 1
        await player.runCommandAsync(`scoreboard players set paradox:config gametestapi 1`);
        await player.runCommandAsync(`scoreboard players operation @a gametestapi = paradox:config gametestapi`);
    } catch (error) {}
}

const GametestCheck = () => {
    World.events.playerSpawn.subscribe(gametestcheck);
};

export { GametestCheck };
