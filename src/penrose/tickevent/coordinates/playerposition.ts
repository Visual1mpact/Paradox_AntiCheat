import { world, system } from "@minecraft/server";

const World = world;

function playerposition() {
    // run as each player
    for (let player of World.getPlayers()) {
        // player position
        try {
            player.runCommandAsync(`scoreboard players set @s xPos ${Math.floor(player.location.x)}`);
            player.runCommandAsync(`scoreboard players set @s yPos ${Math.floor(player.location.y)}`);
            player.runCommandAsync(`scoreboard players set @s zPos ${Math.floor(player.location.z)}`);
        } catch (e) {}
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const PlayerPosition = system.runSchedule(() => {
    playerposition();
}, 20);
