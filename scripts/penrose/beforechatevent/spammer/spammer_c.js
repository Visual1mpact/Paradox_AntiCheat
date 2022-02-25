import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerC = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/C = checks if someone sends a message while using an item
        if (player.hasTag('right') && !player.hasTag('paradoxOpped')) {
            try {
                player.runCommand(`testfor @a[name="${player.nameTag}",tag=right]`);
                flag(player, "Spammer", "C", "Misc", false, false, false, msg);
            } catch (error) {}
        }
    });
};

export { SpammerC };