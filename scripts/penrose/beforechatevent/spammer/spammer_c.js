import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerc(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.spammerC.enabled === false) {
        World.events.beforeChat.unsubscribe(spammerc);
        return;
    }
    const player = msg.sender;

    // Return if player has op
    if (player.hasTag(crypto)) {
        return;
    }

    // Spammer/C = checks if someone sends a message while using an item
    if (player.hasTag('right')) {
        flag(player, "Spammer", "C", "Misc", false, false, false, false, false, msg);
    }
}

const SpammerC = () => {
    World.events.beforeChat.subscribe(msg => spammerc(msg));
};

export { SpammerC };