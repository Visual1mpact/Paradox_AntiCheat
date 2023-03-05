import { BeforeChatEvent, world } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function spammerb(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b");

    // Unsubscribe if disabled in-game
    if (spammerBBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerb);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Spammer/B = checks if someone sends a message while swinging their hand
    if (player.hasTag("left")) {
        flag(player, "Spammer", "B", "Combat", null, null, null, null, false, msg);
    }
}

const SpammerB = () => {
    World.events.beforeChat.subscribe(spammerb);
};

export { SpammerB };
