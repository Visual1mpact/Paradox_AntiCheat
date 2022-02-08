import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = Minecraft.world;

const BadPackets2 = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;
        const message = msg.message.toLowerCase();

        // BadPackets/2 = chat message length check
        if (message.length > config.modules.badpackets2.maxlength || message.length < config.modules.badpackets2.minLength) {
            flag(player, "BadPackets", "2", "messageLength", message.length, false, msg);
        }
    })
}

export { BadPackets2 }