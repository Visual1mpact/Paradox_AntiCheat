import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/B = checks if someone sends a message while swinging their hand
        if (player.hasTag('left') && !player.hasTag('paradoxOpped')) {
            flag(player, "Spammer", "B", "Combat", false, false, false, msg);
        }
    });
};

export { SpammerB };