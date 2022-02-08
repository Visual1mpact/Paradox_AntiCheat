import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import config from "../../../data/config.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const SpammerB = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // get all tags of the player
        let playerTags = getTags(player);

        // Spammer/B = checks if someone sends a message while swinging their hand
        if (playerTags.includes('left')) {
            try {
                Commands.run(`testfor @a[name="${player.nameTag}",tag=left]`, World.getDimension("overworld"));
                flag(player, "Spammer", "B", "Combat", false, false, false, msg);
            } catch (error) {}
        }
    })
}

export { SpammerB }