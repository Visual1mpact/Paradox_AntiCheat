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

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
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
