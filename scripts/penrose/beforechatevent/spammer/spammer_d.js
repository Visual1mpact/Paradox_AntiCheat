import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import config from "../../../data/config.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const SpammerD = () => {
        World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // get all tags of the player
        let playerTags = getTags(player);

        // Spammer/D = checks if someone sends a message while having a GUI open
        if (playerTags.includes('hasGUIopen')) {
            try {
                Commands.run(`testfor @a[name="${player.nameTag}",tag=hasGUIopen]`, World.getDimension("overworld"));
                flag(player, "Spammer", "D", "Misc", false, false, false, msg);
            } catch (error) {}
        }
    })
}

export { SpammerD }