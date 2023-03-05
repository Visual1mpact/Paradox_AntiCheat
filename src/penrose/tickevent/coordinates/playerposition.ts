import { world, system } from "@minecraft/server";

const World = world;

async function playerposition() {
    // run as each player
    for (const player of World.getPlayers()) {
        // player position
        try {
            await player.runCommandAsync(`scoreboard players set @s xPos ${Math.floor(player.location.x)}`);
            await player.runCommandAsync(`scoreboard players set @s yPos ${Math.floor(player.location.y)}`);
            await player.runCommandAsync(`scoreboard players set @s zPos ${Math.floor(player.location.z)}`);
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
