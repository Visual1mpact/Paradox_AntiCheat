import { ChatSendAfterEvent, world } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function badpackets1(msg: ChatSendAfterEvent) {
    // Get Dynamic Property
    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b");

    // Unsubscribe if disabled in-game
    if (badPackets1Boolean === false) {
        world.afterEvents.chatSend.unsubscribe(badpackets1);
        return;
    }
    const player = msg.sender;
    const message = msg.message.toLowerCase();

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // BadPackets/1 = chat message length check
    if (message.length > config.modules.badpackets1.maxlength || message.length < config.modules.badpackets1.minLength) {
        flag(player, "BadPackets", "1", "messageLength", null, null, "Characters", String(message.length), false);
    }
}

const BadPackets1 = () => {
    world.afterEvents.chatSend.subscribe(badpackets1);
};

export { BadPackets1 };
