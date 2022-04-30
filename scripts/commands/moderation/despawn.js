/* eslint no-var: "off"*/
import { EntityQueryOptions, world } from "mojang-minecraft";
import { disabler, getPrefix } from "../../util.js";

const World = world;

/**
 * @name despawn
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function despawn(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/despawn.js:9)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/despawn.js:10)");
    }

    message.cancel = true;

    let player = message.sender;

    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);
    
    // try to find the entity or despawn them all if requested
    let counter = 0;
    let verify = false;
    let filteredEntity;
    let requestedEntity;
    let filter = new EntityQueryOptions();
    filter.excludeTypes = ['player'];
    // Specified entity
    if (args[0] !== "all") {
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
    if (counter > 0) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Despawned ${requestedEntity} (x${counter})!"}]}`);
    }
    if (verify === true) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Despawned all (x${counter})!"}]}`);
    }
    // If nothing then abort and let them know
    if (args[0] !== "all") {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"This entity was not found in the world!"}]}`);
    } else {
        // Need to give a parameter that is recognized
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Please specify which entity or target all!"}]}`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Example: ${prefix}despawn iron_golem"}]}`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Example: ${prefix}despawn all"}]}`);
        return;
    }
}
