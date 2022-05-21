import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";

const World = world;

function survival() {
    // Unsubscribe if disabled in-game
    if (config.modules.survivalGM.enabled === false) {
        World.events.tick.unsubscribe(survival);
        return;
    }
    let filter = new EntityQueryOptions();
    // 0 = survival
    filter.gameMode = 0;
    filter.excludeTags = ['Hash:' + crypto];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Make sure they didn't enable all of them in config.js as this will have a negative impact
        if (config.modules.adventureGM.enabled === true && config.modules.creativeGM.enabled === true) {
            // Default to adventure for safety
            config.modules.adventureGM.enabled = false;
        }
        // Are they in survival? Fix it.
        if (config.modules.adventureGM.enabled === true && config.modules.creativeGM.enabled === false) {
            // Creative is allowed so set them to creative
            player.runCommand(`gamemode c`);
        }
        if (config.modules.adventureGM.enabled === false && config.modules.creativeGM.enabled === true) {
            // Adventure is allowed so set them to adventure
            player.runCommand(`gamemode a`);
        }
        // If both are allowed then default to adventure
        if (config.modules.adventureGM.enabled === false && config.modules.creativeGM.enabled === false) {
            // Adventure is allowed so set them to adventure
            player.runCommand(`gamemode a`);
        }
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_S)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Survival = () => {
    World.events.tick.subscribe(() => survival());
};

export { Survival };