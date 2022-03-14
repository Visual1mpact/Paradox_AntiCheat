import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammera(msg) {
    // Unsubscribe if disabled in-game
    if (config.modules.spammerA.enabled === false) {
        World.events.beforeChat.unsubscribe(spammera);
        return;
    }
    const player = msg.sender;

    // Spammer/A = checks if someone sends a message while moving and on ground
    if (player.hasTag('moving') && player.hasTag('ground') && !player.hasTag('jump') && !player.hasTag('paradoxOpped')) {
        flag(player, "Spammer", "A", "Movement", false, false, true, msg);
    }
}

const SpammerA = () => {
    World.events.beforeChat.subscribe(msg => spammera(msg));
};

export { SpammerA };