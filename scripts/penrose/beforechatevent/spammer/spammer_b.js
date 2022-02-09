import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";

const World = Minecraft.world;

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // get all tags of the player
        let playerTags = getTags(player);

        // Spammer/B = checks if someone sends a message while swinging their hand
        if (playerTags.includes('left')) {
            try {
                player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=left]`);
                flag(player, "Spammer", "B", "Combat", false, false, false, msg);
            } catch (error) {}
        }
    })
}

export { SpammerB }