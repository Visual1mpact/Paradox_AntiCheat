import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function creative() {
    // Unsubscribe if disabled in-game
    if (config.modules.creativeGM.enabled === false) {
        World.events.tick.unsubscribe(creative);
        return;
    }
    let filter = new EntityQueryOptions();
    // 1 = creative
    filter.gameMode = 1;
    filter.excludeTags = ['paradoxOpped'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Are they in creative? Fix it.
        if (config.modules.survivalGM.enabled === true && config.modules.adventureGM.enabled === false) {
            // Adventure is allowed so set them to adventure
            player.runCommand(`gamemode a`);
        }
        if (config.modules.survivalGM.enabled === false && config.modules.adventureGM.enabled === true) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        // If both are allowed then default to survival
        if (config.modules.survivalGM.enabled === false && config.modules.adventureGM.enabled === false) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_C)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Creative = () => {
    World.events.tick.subscribe(() => creative());
};

export { Creative };