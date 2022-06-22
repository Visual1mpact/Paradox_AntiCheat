/* eslint no-var: "off"*/
import { EntityQueryOptions, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function despawnHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.despawn) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: despawn`,
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
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function despawn(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/despawn.js:9)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.despawn) {
        return despawnHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return despawnHelp(player, prefix);
    }
    
    // try to find the entity or despawn them all if requested
    let counter = 0;
    let verify = false;
    let filteredEntity;
    let requestedEntity;
    let filter = new EntityQueryOptions();
    filter.excludeTypes = ['player'];
    // Specified entity
    if (args[0] !== "all" && args.length > 0) {
        for (let entity of World.getDimension('overworld').getEntities(filter)) {
            filteredEntity = entity.id.replace("minecraft:", "");
            requestedEntity = args[0].replace("minecraft:", "");
            // If an entity was specified then handle it here
            if (filteredEntity === requestedEntity || filteredEntity === args[0]) {
                counter = ++counter;
                // Despawn this entity
                entity.triggerEvent('paradox:kick');
                continue;
            // If all entities were specified then handle this here
            } 
        }
    }
    // All entities
    if (args[0] === "all") {
        for (let entity of World.getDimension('overworld').getEntities(filter)) {
            counter = ++counter;
            verify = true;
            // Despawn this entity
            entity.triggerEvent('paradox:kick');
            continue;
        }
    }
    // Let player know how many of the specified entity were removed
    if (counter > 0 && verify === false) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Despawned ${requestedEntity} (x${counter})!`)
    }
    if (verify === true) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Despawned all entities (x${counter})!`)
    }
    // If nothing then abort and let them know
    if (args[0] !== "all" && args.length > 0) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This entity was not found in the world!`)
    } else {
        // Need to give a parameter that is recognized
        return sendMsgToPlayer(player, [
            `§r§4[§6Paradox§4]§r Please specify which entity or target all!`,
            `§r§4[§6Paradox§4]§r Example: ${prefix}despawn iron_golem`,
            `§r§4[§6Paradox§4]§r Example: ${prefix}despawn all`,
        ]);
    }
}
