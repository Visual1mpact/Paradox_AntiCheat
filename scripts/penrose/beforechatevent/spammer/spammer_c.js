import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerC = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/C = checks if someone sends a message while using an item
        if (player.hasTag('right') && !player.hasTag('paradoxOpped')) {
            flag(player, "Spammer", "C", "Misc", false, false, false, msg);
        }
    });
};

export { SpammerC };