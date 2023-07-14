import { ChatSendAfterEvent, world } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function spammera(msg: ChatSendAfterEvent) {
    // Get Dynamic Property
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");

    // Unsubscribe if disabled in-game
    if (spammerABoolean === false) {
        world.afterEvents.chatSend.unsubscribe(spammera);
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
    if (player.hasTag("moving") && player.isOnGround && !player.isJumping) {
        flag(player, "Spammer", "A", "Movement", null, null, null, null, true);
    }
}

const SpammerA = () => {
    world.afterEvents.chatSend.subscribe(spammera);
};

export { SpammerA };
