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

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
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
