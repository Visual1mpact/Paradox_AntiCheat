import { BeforeChatEvent, world } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function spammera(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");

    // Unsubscribe if disabled in-game
    if (spammerABoolean === false) {
        World.events.beforeChat.unsubscribe(spammera);
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

    // Spammer/A = checks if someone sends a message while moving and on ground
    if (player.hasTag("moving") && player.hasTag("ground") && !player.hasTag("jump")) {
        flag(player, "Spammer", "A", "Movement", null, null, null, null, true, msg);
    }
}

const SpammerA = () => {
    World.events.beforeChat.subscribe(spammera);
};

export { SpammerA };
