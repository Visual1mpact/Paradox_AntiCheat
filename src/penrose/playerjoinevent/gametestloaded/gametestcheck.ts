import { Player, world, system } from "@minecraft/server";

const World = world;

// This is to allow passing between functions
let player: Player;
let isChecked = false;

// This function will be called when tick event is triggered from the playerloaded function
function time(id: number) {
    try {
        // We loop testfor until it returns true so we know the
        // player is in the world because playerJoin triggers
        // too quickly while player is in loading screen
        player.runCommandAsync(`testfor @s`);
        try {
            // (1..) Set gametestapi to 1
            player.runCommandAsync(`scoreboard players set paradox:config gametestapi 1`);
            player.runCommandAsync(`scoreboard players operation @a gametestapi = paradox:config gametestapi`);
            isChecked = true;
            system.clearRunSchedule(id);
        } catch (error) {}
    } catch (error) {}
}

// This function will be called when playerJoin event is triggered
const GametestCheck = () => {
    World.events.playerSpawn.subscribe((loaded) => {
        if (isChecked === false) {
            // Get the name of the player who is joining
            player = loaded.player;
            /**
             * We store the identifier in a variable
             * to cancel the execution of this scheduled run
             * if needed to do so.
             */
            const timeId = system.runSchedule(() => {
                time(timeId);
            });
        }
    });
};

export { GametestCheck };
