/* eslint no-var: "off"*/
import { ChatSendBeforeEvent, EntityItemComponent, EntityQueryOptions, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

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
 * @param {ChatSendBeforeEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function despawn(message: ChatSendBeforeEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/despawn.js:31)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

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
    const filter: EntityQueryOptions = {
        excludeTypes: ["player"],
    };
    const filteredEntities = world.getDimension("overworld").getEntities(filter);
    // Specified entity
    if (args[0] !== "all" && args.length > 0) {
        let counter = 0;
        let requestedEntity: string = "";
        for (const entity of filteredEntities) {
            const filteredEntity = entity.typeId.replace("minecraft:", "");
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
        if (counter > 0) {
            return sendMsgToPlayer(player, ` §6|§r §4[§r${requestedEntity}§4]§r §6Amount: §4x${counter}§r`);
        } else {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No entity found to despawn!`);
        }
    }
    // All entities
    if (args[0] === "all") {
        const entityCount: { [key: string]: number } = {};
        for (const entity of filteredEntities) {
            let filteredEntity = entity.typeId.replace("minecraft:", "");
            if (filteredEntity === "item") {
                const itemContainer = entity.getComponent("item") as EntityItemComponent;
                const itemName = itemContainer.itemStack;
                if (itemName !== undefined) {
                    filteredEntity = itemName.typeId.replace("minecraft:", "");
                }
            }
            if (!entityCount[filteredEntity]) {
                entityCount[filteredEntity] = 1;
            } else {
                entityCount[filteredEntity]++;
            }
            // Despawn this entity
            entity.triggerEvent("paradox:kick");
        }
        let totalCounter = 0;
        let entityMessage = "";
        for (const entity in entityCount) {
            if (entityCount.hasOwnProperty(entity)) {
                const count = entityCount[entity];
                if (count > 0) {
                    entityMessage += ` §6|§r §4[§r${entity}§4]§r §6Amount: §4x${count}§r\n`;
                    totalCounter += count;
                }
            }
        }
        if (totalCounter > 0) {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Despawned:`);
            return sendMsgToPlayer(player, entityMessage);
        } else {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No entities found to despawn!`);
        }
    }
}
