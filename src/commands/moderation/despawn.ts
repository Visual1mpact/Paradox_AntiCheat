/* eslint no-var: "off"*/
import { BeforeChatEvent, EntityQueryOptions, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function despawnHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.despawn) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: despawn`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: despawn [optional]`,
        `§4[§6Optional§4]§r: entity, all, help`,
        `§4[§6Description§4]§r: Despawns all or specified entities if they exist.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}despawn all`,
        `    ${prefix}despawn iron_golem`,
        `    ${prefix}despawn creeper`,
        `    ${prefix}despawn help`,
    ]);
}

/**
 * @name despawn
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function despawn(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/despawn.js:31)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.despawn) {
        return despawnHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return despawnHelp(player, prefix);
    }

    // try to find the entity or despawn them all if requested
    let counter = 0;
    let verify = false;
    let filteredEntity: string;
    let requestedEntity: string;
    const filter = new Object() as EntityQueryOptions;
    filter.excludeTypes = ["player"];
    // Specified entity
    if (args[0] !== "all" && args.length > 0) {
        for (const entity of World.getDimension("overworld").getEntities(filter)) {
            filteredEntity = entity.id.replace("minecraft:", "");
            requestedEntity = args[0].replace("minecraft:", "");
            // If an entity was specified then handle it here
            if (filteredEntity === requestedEntity || filteredEntity === args[0]) {
                counter = ++counter;
                // Despawn this entity
                entity.triggerEvent("paradox:kick");
                continue;
                // If all entities were specified then handle this here
            }
        }
    }
    // All entities
    if (args[0] === "all") {
        for (const entity of World.getDimension("overworld").getEntities(filter)) {
            counter = ++counter;
            verify = true;
            // Despawn this entity
            entity.triggerEvent("paradox:kick");
            continue;
        }
    }
    // Let player know how many of the specified entity were removed
    if (counter > 0 && verify === false) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Despawned ${requestedEntity} (x${counter})!`);
    }
    if (verify === true) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Despawned all entities (x${counter})!`);
    }
    // If nothing then abort and let them know
    if (args[0] !== "all" && args.length > 0) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This entity was not found in the world!`);
    } else {
        // Need to give a parameter that is recognized
        return sendMsgToPlayer(player, [`§r§4[§6Paradox§4]§r Please specify which entity or target all!`, `§r§4[§6Paradox§4]§r Example: ${prefix}despawn iron_golem`, `§r§4[§6Paradox§4]§r Example: ${prefix}despawn all`]);
    }
}
