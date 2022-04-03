import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function badpackets1(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.badpackets1.enabled === false) {
        World.events.beforeChat.unsubscribe(badpackets1);
        return;
    }
    const player = msg.sender;
    const message = msg.message.toLowerCase();

    // BadPackets/1 = chat message length check
    if (message.length > config.modules.badpackets1.maxlength && !player.hasTag('paradoxOpped') || message.length < config.modules.badpackets1.minLength && !player.hasTag('paradoxOpped')) {
        flag(player, "BadPackets", "1", "messageLength", false, false, "Characters", message.length, false, msg);
    }
}

const BadPackets1 = () => {
    World.events.beforeChat.subscribe(msg => badpackets1(msg));
};

export { BadPackets1 };