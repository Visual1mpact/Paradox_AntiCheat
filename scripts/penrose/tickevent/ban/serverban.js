import * as Minecraft from "mojang-minecraft";
import { banMessage, disabler } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ServerBan = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // Ban message
            try {
                player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=isBanned]`);
                banMessage(player);
            } catch(error) {}
        }
    }, 40); // Executes every 2 seconds
};

export { ServerBan };