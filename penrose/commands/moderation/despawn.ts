import { ChatSendBeforeEvent, EntityQueryOptions, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

/**
 * Represents the despawn command.
 */
export const despawnCommand: Command = {
    name: "despawn",
    description: "Despawns all or specified entities if they exist.",
    usage: "{prefix}despawn <entity_type | all>",
    examples: [`{prefix}despawn all`, `{prefix}despawn iron_golem`, `{prefix}despawn "iron_golem"`, `{prefix}despawn help`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/csb_purchase_error.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Despawn Entities",
        description:
            "Manage and despawn entities in the world.\n\n" +
            "Â§7âÿ¢ Â§fDespawn All EntitiesÂ§7: Remove all entities except players.\n" +
            "Â§7âÿ¢ Â§fDespawn Specific EntityÂ§7: Remove entities of a specified type.\n\n" +
            "Â§7Rules & Notes:\n" +
            "Â§7âÿ¢ Players are never affected.\n" +
            "Â§7âÿ¢ Named or tamed entities are protected and will not be removed.\n" +
            "Â§7âÿ¢ Use exact entity type names (case-sensitive) when targeting specific entities.\n" +
            "Â§7âÿ¢ You can use 'all' to remove all eligible entities.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Despawn All Entities",
                command: ["all"],
                description: "Removes all entities except players.",
                icon: "textures/ui/csb_faq_pig.png",
            },
            {
                name: "Despawn Specific Entity",
                description: "Despawn entities of a specified type.",
                requiredFields: ["entityType"],
                generateModalForm: true,
                icon: "textures/ui/promo_creeper.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Entity Type:",
                type: "dropdown",
                sourceType: "entities",
                requiredFields: ["entityType"],
            },
        ],
    },

    /**
     * Executes the despawn command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const parameter = args.join(" ").replace(/["@]/g, "");

        const filter: EntityQueryOptions = { excludeTypes: ["player"] };
        const filteredEntities = world.getDimension(message.sender.dimension.id).getEntities(filter);

        const despawnedEntities = new Map<string, number>();

        for (const entity of filteredEntities) {
            const typeId = entity.typeId.replace("minecraft:", "");
            const isAllRequested = parameter === "all";

            // Skip tamed or named entities
            const tameable = entity.getComponent("tameable");
            const isTamed = tameable?.isTamed ?? false;
            const hasNameTag = !!entity.nameTag;

            if (isTamed || hasNameTag) continue; // ignore protected entities

            if (isAllRequested || typeId === parameter || typeId === parameter.replace("minecraft:", "")) {
                const count = despawnedEntities.get(typeId) ?? 0;
                despawnedEntities.set(typeId, count + 1);
                entity.remove();
            }
        }

        if (despawnedEntities.size > 0) {
            message.sender.sendMessage("\nÂ§2[Â§7ParadoxÂ§2]Â§oÂ§7 Despawned:");
            despawnedEntities.forEach((count, entity) => {
                message.sender.sendMessage(` Â§oÂ§7| Â§2[Â§f${entity}Â§2]Â§7 Amount: Â§2x${count}Â§f`);
            });
        } else {
            message.sender.sendMessage("Â§2[Â§7ParadoxÂ§2]Â§oÂ§7 No entities found to despawn!");
        }
    },
};
