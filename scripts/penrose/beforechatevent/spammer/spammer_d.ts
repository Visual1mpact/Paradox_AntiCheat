import { BeforeChatEvent, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerd(msg: BeforeChatEvent) {
    // Get Dynamic Property
    let spammerDBoolean = World.getDynamicProperty("spammerd_b");
    if (spammerDBoolean === undefined) {
        spammerDBoolean = config.modules.spammerD.enabled;
    }
    // Unsubscribe if disabled in-game
    if (spammerDBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerd);
        return;
    }
    const player = msg.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
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
