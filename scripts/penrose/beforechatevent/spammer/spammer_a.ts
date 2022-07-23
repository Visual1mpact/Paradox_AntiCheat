import { BeforeChatEvent, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammera(msg: BeforeChatEvent) {
    // Get Dynamic Property
    let spammerABoolean = World.getDynamicProperty('spammera_b');
    if (spammerABoolean === undefined) {
        spammerABoolean = config.modules.spammerA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (spammerABoolean === false) {
        World.events.beforeChat.unsubscribe(spammera);
        return;
    }
    const player = msg.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // Spammer/A = checks if someone sends a message while moving and on ground
    if (player.hasTag('moving') && player.hasTag('ground') && !player.hasTag('jump')) {
        flag(player, "Spammer", "A", "Movement", null, null, null, null, true, msg);
    }
}

const SpammerA = () => {
    World.events.beforeChat.subscribe(spammera);
};

export { SpammerA };