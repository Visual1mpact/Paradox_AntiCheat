import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerd(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.spammerD.enabled === false) {
        World.events.beforeChat.unsubscribe(spammerd);
        return;
    }
    const player = msg.sender;

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // Spammer/D = checks if someone sends a message while having a GUI open
    if (player.hasTag('hasGUIopen')) {
        flag(player, "Spammer", "D", "Misc", false, false, false, false, false, msg);
    }
}

const SpammerD = () => {
        World.events.beforeChat.subscribe(msg => spammerd(msg));
};

export { SpammerD };