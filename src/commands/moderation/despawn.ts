import { ChatSendAfterEvent, EntityItemComponent, EntityQueryOptions, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

function despawnHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.despawn) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: despawn`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: despawn [optional]`,
        `§4[§6Optional§4]§f: entity, all, help`,
        `§4[§6Description§4]§f: Despawns all or specified entities if they exist.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}despawn all`,
        `        §4- §6Despawn all entities§f`,
        `    ${prefix}despawn iron_golem`,
        `        §4- §6Despawn all "iron_golem" entities§f`,
        `    ${prefix}despawn creeper`,
        `        §4- §6Despawn all "creeper" entities§f`,
        `    ${prefix}despawn help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name despawn
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function despawn(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/despawn.js:31)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
                entity.remove();
                continue;
                // If all entities were specified then handle this here
            }
        }
        if (counter > 0) {
            return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Despawned:\n\n §o§6|§f §4[§f${requestedEntity}§4]§f §6Amount: §4x${counter}§f`);
        } else {
            return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No entity found to despawn!`);
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
            entity.remove();
        }
        let totalCounter = 0;
        let entityMessage = "";
        for (const entity in entityCount) {
            if (entityCount.hasOwnProperty(entity)) {
                const count = entityCount[entity];
                if (count > 0) {
                    entityMessage += ` §o§6|§f §4[§f${entity}§4]§f §6Amount: §4x${count}§f\n`;
                    totalCounter += count;
                }
            }
        }
        if (totalCounter > 0) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Despawned:`);
            return sendMsgToPlayer(player, entityMessage);
        } else {
            return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No entities found to despawn!`);
        }
    }
}
