import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerD = () => {
        World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/D = checks if someone sends a message while having a GUI open
        if (player.hasTag('hasGUIopen') && !player.hasTag('paradoxOpped')) {
            try {
                player.runCommand(`testfor @a[name="${player.nameTag}",tag=hasGUIopen]`);
                flag(player, "Spammer", "D", "Misc", false, false, false, msg);
            } catch (error) {}
        }
    });
};

export { SpammerD };