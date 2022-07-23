import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto, getScore, sendMsg } from "../../../util.js";

const World = world;

function adventure() {
    // Get Dynamic Property
    let adventureGMBoolean = World.getDynamicProperty('adventuregm_b');
    if (adventureGMBoolean === undefined) {
        adventureGMBoolean = config.modules.adventureGM.enabled;
    }
    let creativeGMBoolean = World.getDynamicProperty('creativegm_b');
    if (creativeGMBoolean === undefined) {
        creativeGMBoolean = config.modules.creativeGM.enabled;
    }
    let survivalGMBoolean = World.getDynamicProperty('survivalgm_b');
    if (survivalGMBoolean === undefined) {
        survivalGMBoolean = config.modules.survivalGM.enabled;
    }
    // Unsubscribe if disabled in-game
    if (adventureGMBoolean === false) {
        World.events.tick.unsubscribe(adventure);
        return;
    }
    let filter = new EntityQueryOptions();
    // 2 = adventure
    filter.gameMode = 2;
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty('hash');
        let salt = player.getDynamicProperty('salt');
        let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // Make sure they didn't enable all of them in config.js as this will have a negative impact
        if (survivalGMBoolean === true && creativeGMBoolean === true) {
            // Default to adventure for safety
            World.setDynamicProperty('adventuregm_b', false);
        }
        // Are they in adventure? Fix it.
        if (survivalGMBoolean === true && creativeGMBoolean === false) {
            // Creative is allowed so set them to creative
            player.runCommand(`gamemode c`);
        }
        if (survivalGMBoolean === false && creativeGMBoolean === true) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        // If both are allowed then default to survival
        if (survivalGMBoolean === false && creativeGMBoolean === false) {
            // Survival is allowed so set them to survival
            player.runCommand(`gamemode s`);
        }
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r ${player.nameTag} §6has tried to change their gamemode §7(Gamemode_A)§6.§4 VL= ${getScore('gamemodevl', player)}`);
    }
}

const Adventure = () => {
    World.events.tick.subscribe(adventure);
};

export { Adventure };