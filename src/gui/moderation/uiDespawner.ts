import { EntityItemComponent, EntityQueryOptions, Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiDESPAWNER(despawnerResult: ModalFormResponse, player: Player) {
    const [entityValue, DespawnAllToggle] = despawnerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }
    // try to find the entity or despawn them all if requested
    const filter = new Object() as EntityQueryOptions;
    filter.excludeTypes = ["player"];
    // Specified entity
    let counter = 0;
    let requestedEntity: string = "";
    for (const entity of world.getDimension("overworld").getEntities(filter)) {
        const filteredEntity = entity.typeId.replace("minecraft:", "");
        requestedEntity = entityValue.replace("minecraft:", "");
        // If an entity was specified then handle it here
        if (filteredEntity === requestedEntity || filteredEntity === entityValue) {
            counter = ++counter;
            // Despawn this entity
            entity.triggerEvent("paradox:kick");
            continue;
            // If all entities were specified then handle this here
        }
    }
    if (counter > 0) {
        sendMsgToPlayer(player, ` | §fDespawned§r §6=>§r §4[§r${requestedEntity}§4]§r §6Amount: §4x${counter}§r`);
    } else {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No entity found to despawn!`);
    }
    if (DespawnAllToggle === true) {
        const entityCount = {};
        for (const entity of world.getDimension("overworld").getEntities(filter)) {
            let filteredEntity = entity.typeId.replace("minecraft:", "");
            if (filteredEntity === "item") {
                const itemContainer = entity.getComponent("item") as unknown as EntityItemComponent;
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
                    entityMessage += ` | §fDespawned§r §6=>§r §4[§r${entity}§4]§r §6Amount: §4x${count}§r\n`;
                    totalCounter += count;
                }
            }
        }
        if (totalCounter > 0) {
            return sendMsgToPlayer(player, entityMessage);
        } else {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No entities found to despawn!`);
        }
    }
    return paradoxui;
}
