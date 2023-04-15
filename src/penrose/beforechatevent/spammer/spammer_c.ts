import { BeforeChatEvent, world } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

function spammerc(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");

    // Unsubscribe if disabled in-game
    if (spammerCBoolean === false) {
        world.events.beforeChat.unsubscribe(spammerc);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Spammer/C = checks if someone sends a message while using an item
    if (player.hasTag("right")) {
        flag(player, "Spammer", "C", "Misc", null, null, null, null, false, msg);
    }
}

const SpammerC = () => {
    world.events.beforeChat.subscribe(spammerc);
};

export { SpammerC };
