import * as Minecraft from "mojang-minecraft";
import { banMessage } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ServerBan = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");
            // Ban message
            try {
                player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=isBanned]`);
                banMessage(player);
            } catch(error) {}
        }
    }, 40) //Executes every 2 seconds
}

export { ServerBan }