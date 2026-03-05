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
        description: "Manage and despawn entities in the world.\n\n",
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
        const parameter = args.join(" ").trim().replace(/["@]/g, "");

        const filter: EntityQueryOptions = { excludeTypes: ["player"] };
        const filteredEntities = world.getDimension(message.sender.dimension.id).getEntities(filter);

        const despawnedEntities = new Map<string, number>();

        for (const entity of filteredEntities) {
            const typeId = entity.typeId.replace("minecraft:", "");
            const isAllRequested = parameter === "all";

            // Skip tamed or named entities
            const hasTameable = entity.hasComponent("tameable");
            const isTamed = hasTameable ? entity.getComponent("tameable").isTamed : false;
            const hasNameTag = !!entity.nameTag;

            if (isTamed || hasNameTag) continue; // ignore protected entities

            if (isAllRequested || typeId === parameter || typeId === parameter.replace("minecraft:", "")) {
                const count = despawnedEntities.get(typeId) ?? 0;
                despawnedEntities.set(typeId, count + 1);
                entity.remove();
            }
        }

        if (despawnedEntities.size > 0) {
            message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Despawned:");
            despawnedEntities.forEach((count, entity) => {
                message.sender.sendMessage(` §o§7| §2[§f${entity}§2]§7 Amount: §2x${count}§f`);
            });
        } else {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 No entities found to despawn!");
        }
    },
};
