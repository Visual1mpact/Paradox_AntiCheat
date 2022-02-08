import * as Minecraft from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const PlayerPosition = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // player position
            try {
                World.getDimension("overworld").runCommand(`scoreboard players set "${player.nameTag}" xPos ${Math.floor(player.location.x)}`);
                World.getDimension("overworld").runCommand(`scoreboard players set "${player.nameTag}" yPos ${Math.floor(player.location.y)}`);
                World.getDimension("overworld").runCommand(`scoreboard players set "${player.nameTag}" zPos ${Math.floor(player.location.z)}`);
            } catch(e) {}
        }
    }, 20) //Executes every 1 seconds
}

export { PlayerPosition }