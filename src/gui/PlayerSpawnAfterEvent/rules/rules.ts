import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { ShowRules } from "../../showrules/showrules.js";
import { dynamicPropertyRegistry } from "../../../penrose/WorldInitializeAfterEvent/registry.js";

/**
 * Handles the player spawn event and displays join rules.
 *
 * @name onJoinRules
 * @param {PlayerSpawnAfterEvent} object - The player spawn event object.
 */
export function onJoinRules(object: PlayerSpawnAfterEvent) {
    handledleOnJoinRules(object).catch((error) => {
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
}

async function handledleOnJoinRules(object: PlayerSpawnAfterEvent) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false) {
        world.afterEvents.playerSpawn.unsubscribe(onJoinRules);
        return;
    }

    // Properties of class
    const { player, initialSpawn } = object;

    // Show rules if its their initial spawn in the world
    if (initialSpawn === true) {
        player.addTag("ShowRulesOnJoin");
        ShowRules();
    } else {
        return;
    }
}
const onJoinrules = () => {
    world.afterEvents.playerSpawn.subscribe(onJoinRules);
};

export { onJoinrules };
