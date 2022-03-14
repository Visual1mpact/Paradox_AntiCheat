import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function badpackets2(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.badpackets2.enabled === false) {
        World.events.beforeChat.unsubscribe(badpackets2);
        return;
    }
    const player = msg.sender;
    const message = msg.message.toLowerCase();

    // BadPackets/2 = chat message length check
    if (message.length > config.modules.badpackets2.maxlength && !player.hasTag('paradoxOpped') || message.length < config.modules.badpackets2.minLength && !player.hasTag('paradoxOpped')) {
        flag(player, "BadPackets", "2", "messageLength", message.length, false, msg);
    }
}

const BadPackets2 = () => {
    World.events.beforeChat.subscribe(msg => badpackets2(msg));
};

export { BadPackets2 };