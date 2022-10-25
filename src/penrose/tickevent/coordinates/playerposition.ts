import { world } from "@minecraft/server";
import { setTickInterval } from "../../../libs/scheduling.js";

const World = world;

const PlayerPosition = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // player position
            try {
                player.runCommand(`scoreboard players set @s xPos ${Math.floor(player.location.x)}`);
                player.runCommand(`scoreboard players set @s yPos ${Math.floor(player.location.y)}`);
                player.runCommand(`scoreboard players set @s zPos ${Math.floor(player.location.z)}`);
            } catch (e) {}
        }
    }, 20); // Executes every 1 seconds
};

export { PlayerPosition };
