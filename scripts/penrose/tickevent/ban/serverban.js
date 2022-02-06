import * as Minecraft from "mojang-minecraft";
import { banMessage } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const ServerBan = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // Ban message
            try {
                Commands.run(`testfor @a[name="${player.nameTag}",tag=isBanned]`, World.getDimension("overworld"));
                banMessage(player);
            } catch(error) {}
        }
    }, 40) //Executes every 2 seconds
}

export { ServerBan }