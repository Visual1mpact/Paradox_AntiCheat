import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";

const World = Minecraft.world;

const SpammerC = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // get all tags of the player
        let playerTags = getTags(player);

        // Spammer/C = checks if someone sends a message while using an item
        if (playerTags.includes('right')) {
            try {
                World.getDimension("overworld").runCommand(`testfor @a[name="${player.nameTag}",tag=right]`);
                flag(player, "Spammer", "C", "Misc", false, false, false, msg);
            } catch (error) {}
        }
    })
}

export { SpammerC }