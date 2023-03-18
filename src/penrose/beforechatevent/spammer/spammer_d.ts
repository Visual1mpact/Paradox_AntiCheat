import { BeforeChatEvent, world } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

function spammerd(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerDBoolean = dynamicPropertyRegistry.get("spammerd_b");

    // Unsubscribe if disabled in-game
    if (spammerDBoolean === false) {
        world.events.beforeChat.unsubscribe(spammerd);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Spammer/D = checks if someone sends a message while having a GUI open
    if (player.hasTag("hasGUIopen")) {
        flag(player, "Spammer", "D", "Misc", null, null, null, null, false, msg);
    }
}

const SpammerD = () => {
    world.events.beforeChat.subscribe(spammerd);
};

export { SpammerD };
