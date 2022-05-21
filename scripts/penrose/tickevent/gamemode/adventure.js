import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";

const World = world;

function adventure() {
    // Unsubscribe if disabled in-game
    if (config.modules.adventureGM.enabled === false) {
        World.events.tick.unsubscribe(adventure);
        return;
    }
    let filter = new EntityQueryOptions();
    // 2 = adventure
    filter.gameMode = 2;
    filter.excludeTags = ['Hash' + crypto];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Make sure they didn't enable all of them in config.js as this will have a negative impact
        if (config.modules.survivalGM.enabled === true && config.modules.creativeGM.enabled === true) {
            // Default to adventure for safety
            config.modules.adventureGM.enabled = false;
        }
        // Are they in adventure? Fix it.
        if (config.modules.survivalGM.enabled === true && config.modules.creativeGM.enabled === false) {
            // Creative is allowed so set them to creative
            player.runCommand(`gamemode c`);
        }
        if (config.modules.survivalGM.enabled === false && config.modules.creativeGM.enabled === true) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        // If both are allowed then default to survival
        if (config.modules.survivalGM.enabled === false && config.modules.creativeGM.enabled === false) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_A)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Adventure = () => {
    World.events.tick.subscribe(() => adventure());
};

export { Adventure };