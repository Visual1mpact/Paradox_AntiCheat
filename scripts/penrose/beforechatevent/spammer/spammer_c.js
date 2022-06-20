import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerc(msg) {
    // Get Dynamic Property
    let spammerCBoolean = World.getDynamicProperty('spammerc_b');
    if (spammerCBoolean === undefined) {
        spammerCBoolean = config.modules.spammerC.enabled;
    }
    // Unsubscribe if disabled in-game
    if (spammerCBoolean === false) {
        World.events.beforeChat.unsubscribe(spammerc);
        return;
    }
    const player = msg.sender;

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // Spammer/C = checks if someone sends a message while using an item
    if (player.hasTag('right')) {
        flag(player, "Spammer", "C", "Misc", false, false, false, false, false, msg);
    }
}

const SpammerC = () => {
    World.events.beforeChat.subscribe(spammerc);
};

export { SpammerC };