import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeEvent/registry.js";

function spammera(msg: ChatSendBeforeEvent) {
    // Get Dynamic Property
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");

    // Unsubscribe if disabled in-game
    if (spammerABoolean === false) {
        world.beforeEvents.chatSend.unsubscribe(spammera);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Spammer/A = checks if someone sends a message while moving and on ground
    if (player.hasTag("moving") && player.hasTag("ground") && !player.hasTag("jump")) {
        flag(player, "Spammer", "A", "Movement", null, null, null, null, true, msg);
    }
}

const SpammerA = () => {
    world.beforeEvents.chatSend.subscribe(spammera);
};

export { SpammerA };
