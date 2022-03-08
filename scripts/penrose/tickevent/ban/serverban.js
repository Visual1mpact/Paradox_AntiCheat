import * as Minecraft from "mojang-minecraft";
import { banMessage } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ServerBan = () => {
    setTickInterval(() => {
        let tag = new Minecraft.EntityQueryOptions();
        tag.tags = ['isBanned'];
        // run as each player
        for (let player of World.getPlayers(tag)) {
            // Ban message
            banMessage(player);
        }
    }, 40); // Executes every 2 seconds
};

export { ServerBan };