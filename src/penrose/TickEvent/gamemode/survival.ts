import { world, EntityQueryOptions, GameMode, system } from "@minecraft/server";
import { sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { ScoreManager } from "../../../classes/ScoreManager.js";

async function survival(id: number) {
    // Get Dynamic Property
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");

    // Unsubscribe if disabled in-game
    if (survivalGMBoolean === false) {
        system.clearRun(id);
        return;
    }
    const filter: EntityQueryOptions = {
        gameMode: GameMode.survival,
    };
    const filteredPlayers = world.getPlayers(filter);
    // Run as each player
    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }
        // Make sure they didn't enable all of them in config.js as this will have a negative impact
        if (adventureGMBoolean === true && creativeGMBoolean === true) {
            // Default to adventure for safety
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
        }
        // Are they in survival? Fix it.
        if (adventureGMBoolean === true && creativeGMBoolean === false) {
            // Creative is allowed so set them to creative
            player.runCommandAsync(`gamemode c`);
        }
        if (adventureGMBoolean === false && creativeGMBoolean === true) {
            // Adventure is allowed so set them to adventure
            player.runCommandAsync(`gamemode a`);
        }
        // If both are allowed then default to adventure
        if (adventureGMBoolean === false && creativeGMBoolean === false) {
            // Adventure is allowed so set them to adventure
            player.runCommandAsync(`gamemode a`);
        }
        ScoreManager.setScore(player, "gamemodevl", 1, true);
        sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${player.name} §6has tried to change their gamemode §7(Gamemode_S)§6.§4 VL= ${ScoreManager.getScore("gamemodevl", player)}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function Survival() {
    const survivalId = system.runInterval(() => {
        survival(survivalId).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    }, 20);
}
