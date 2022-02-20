import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/B = checks if someone sends a message while swinging their hand
        if (player.hasTag('left') && !player.hasTag('op')) {
            try {
                player.runCommand(`testfor @a[name="${player.nameTag}",tag=left]`);
                flag(player, "Spammer", "B", "Combat", false, false, false, msg);
            } catch (error) {}
        }
    });
};

export { SpammerB };