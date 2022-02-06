import * as Minecraft from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const PlayerPosition = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // player position
            try {
                Commands.run(`scoreboard players set "${player.nameTag}" xPos ${Math.floor(player.location.x)}`, World.getDimension("overworld"));
                Commands.run(`scoreboard players set "${player.nameTag}" yPos ${Math.floor(player.location.y)}`, World.getDimension("overworld"));
                Commands.run(`scoreboard players set "${player.nameTag}" zPos ${Math.floor(player.location.z)}`, World.getDimension("overworld"));
            } catch(e) {}
        }
    }, 20) //Executes every 1 seconds
}

export { PlayerPosition }