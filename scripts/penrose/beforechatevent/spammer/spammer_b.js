import * as Minecraft from "mojang-minecraft";
import { flag, disabler } from "../../../util.js";

const World = Minecraft.world;

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/B = checks if someone sends a message while swinging their hand
        if (player.hasTag('left') && !player.hasTag('paradoxOpped')) {
            try {
                player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=left]`);
                flag(player, "Spammer", "B", "Combat", false, false, false, msg);
            } catch (error) {}
        }
    });
};

export { SpammerB };