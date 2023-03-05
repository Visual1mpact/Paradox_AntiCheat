import { BeforeChatEvent, world } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function spammerc(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");

    // Unsubscribe if disabled in-game
    if (spammerCBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerc);
        return;
    }
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

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
    World.events.beforeChat.subscribe(spammerc);
};

export { SpammerC };
