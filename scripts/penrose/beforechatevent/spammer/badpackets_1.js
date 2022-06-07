import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function badpackets1(msg) {
    // Get Dynamic Property
    let badPackets1Boolean = World.getDynamicProperty('badpackets1_b');
    if (badPackets1Boolean === undefined) {
        badPackets1Boolean = config.modules.badpackets1.enabled;
    }
    // Unsubscribe if disabled in-game
    if (badPackets1Boolean === false) {
        World.events.beforeChat.unsubscribe(badpackets1);
        return;
    }
    const player = msg.sender;
    const message = msg.message.toLowerCase();

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // BadPackets/1 = chat message length check
    if (message.length > config.modules.badpackets1.maxlength || message.length < config.modules.badpackets1.minLength) {
        flag(player, "BadPackets", "1", "messageLength", false, false, "Characters", message.length, false, msg);
    }
}

const BadPackets1 = () => {
    World.events.beforeChat.subscribe(msg => badpackets1(msg));
};

export { BadPackets1 };