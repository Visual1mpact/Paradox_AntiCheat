import { BeforeChatEvent, world } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function spammerd(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerDBoolean = dynamicPropertyRegistry.get("spammerd_b");

    // Unsubscribe if disabled in-game
    if (spammerDBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerd);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

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
    World.events.beforeChat.subscribe(spammerd);
};

export { SpammerD };
