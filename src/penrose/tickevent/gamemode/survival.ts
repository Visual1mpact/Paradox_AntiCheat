import { world, EntityQueryOptions, GameMode, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, getScore, sendMsg, setScore } from "../../../util.js";

const World = world;

async function survival(id: number) {
    // Get Dynamic Property
    let adventureGMBoolean = World.getDynamicProperty("adventuregm_b");
    if (adventureGMBoolean === undefined) {
        adventureGMBoolean = config.modules.adventureGM.enabled;
    }
    let creativeGMBoolean = World.getDynamicProperty("creativegm_b");
    if (creativeGMBoolean === undefined) {
        creativeGMBoolean = config.modules.creativeGM.enabled;
    }
    let survivalGMBoolean = World.getDynamicProperty("survivalgm_b");
    if (survivalGMBoolean === undefined) {
        survivalGMBoolean = config.modules.survivalGM.enabled;
    }
    // Unsubscribe if disabled in-game
    if (survivalGMBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    const filter = new Object() as EntityQueryOptions;
    // 0 = survival
    filter.gameMode = GameMode.survival;
    // Run as each player
    for (const player of World.getPlayers(filter)) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // Make sure they didn't enable all of them in config.js as this will have a negative impact
        if (adventureGMBoolean === true && creativeGMBoolean === true) {
            // Default to adventure for safety
            World.setDynamicProperty("adventuregm_b", false);
        }
        // Are they in survival? Fix it.
        if (adventureGMBoolean === true && creativeGMBoolean === false) {
            // Creative is allowed so set them to creative
            await player.runCommandAsync(`gamemode c`);
        }
        if (adventureGMBoolean === false && creativeGMBoolean === true) {
            // Adventure is allowed so set them to adventure
            await player.runCommandAsync(`gamemode a`);
        }
        // If both are allowed then default to adventure
        if (adventureGMBoolean === false && creativeGMBoolean === false) {
            // Adventure is allowed so set them to adventure
            await player.runCommandAsync(`gamemode a`);
        }
        setScore(player, "gamemodevl", 1, true);
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} §6has tried to change their gamemode §7(Gamemode_S)§6.§4 VL= ${getScore("gamemodevl", player)}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function Survival() {
    const survivalId = system.runSchedule(() => {
        survival(survivalId);
    });
}
