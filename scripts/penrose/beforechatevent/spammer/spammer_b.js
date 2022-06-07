import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerb(msg) {
    // Get Dynamic Property
    let spammerBBoolean = World.getDynamicProperty('spammerb_b');
    if (spammerBBoolean === undefined) {
        spammerBBoolean = config.modules.spammerB.enabled;
    }
    // Unsubscribe if disabled in-game
    if (spammerBBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerb);
        return;
    }
    const player = msg.sender;

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // Spammer/B = checks if someone sends a message while swinging their hand
    if (player.hasTag('left')) {
        flag(player, "Spammer", "B", "Combat", false, false, false, false, false, msg);
    }
}

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => spammerb(msg));
};

export { SpammerB };