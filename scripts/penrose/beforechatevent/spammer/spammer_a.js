import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammera(msg) {
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

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // Spammer/A = checks if someone sends a message while moving and on ground
    if (player.hasTag('moving') && player.hasTag('ground') && !player.hasTag('jump')) {
        flag(player, "Spammer", "A", "Movement", false, false, false, false, true, msg);
    }
}

const SpammerA = () => {
    World.events.beforeChat.subscribe(spammera);
};

export { SpammerA };