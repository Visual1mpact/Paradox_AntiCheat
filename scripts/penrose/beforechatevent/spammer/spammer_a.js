import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const SpammerA = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Spammer/A = checks if someone sends a message while moving and on ground
        if (player.hasTag('moving') && player.hasTag('ground') && !player.hasTag('jump') && !player.hasTag('op')) {
            try {
                player.runCommand(`testfor @a[name="${player.nameTag}",tag=moving,tag=ground,tag=!jump]`);
                flag(player, "Spammer", "A", "Movement", false, false, true, msg);
            } catch (error) {}
        }
    });
};

export { SpammerA };