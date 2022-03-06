import * as Minecraft from "mojang-minecraft";
import { banMessage, disabler } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ServerBan = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // Ban message
            if (player.hasTag('isBanned')) {
                banMessage(player);
            }
        }
    }, 40); // Executes every 2 seconds
};

export { ServerBan };