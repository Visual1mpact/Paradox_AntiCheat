import { Player, ChatSendBeforeEvent, ItemStack } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Represents the invclone command.
 * Clones a player's inventory into placed shulker boxes for inspection.
 */
export const invcloneCommand: Command = {
    name: "invclone",
    description: "Clones the entire inventory of the specified player into shulker boxes for inspection.",
    usage: "{prefix}invclone <player>",
    examples: [`{prefix}invclone PlayerName`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/item_cell.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Cloner",
        description: "Clone a player's inventory into black shulker boxes placed on the ground for inspection.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Clone Inventory",
                description: "Clone the inventory of a specified player",
                requiredFields: ["playerName"],
                icon: "textures/ui/icon_multiplayer.png",
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Players Name:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the invclone command.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        if (!message || !args || !args.length) {
            message?.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        const playerName: string = args.join(" ").trim().replace(/["@]/g, "");
        const target: Player | undefined = PlayerCache.getPlayerByName(playerName);

        if (!target || !target.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Failed to find player "${playerName}"!`);
            return;
        }

        const targetInv = target.getComponent("minecraft:inventory")?.container;
        if (!targetInv) {
            message.sender.sendMessage(`§o§c[Paradox] Cannot access ${target.name}'s inventory.`);
            return;
        }

        /**
         * Collect all items from the player's inventory
         */
        const inventoryItems: ItemStack[] = [];

        for (let i = 0; i < targetInv.size; i++) {
            const item = targetInv.getItem(i);
            if (item) inventoryItems.push(item.clone());
        }

        const dimension = message.sender.dimension;
        const base = message.sender.location;

        let shulkerCount = 0;
        let offset = 1;

        /**
         * Place shulker boxes and fill them
         */
        while (inventoryItems.length > 0) {
            const location = {
                x: Math.floor(base.x) + offset,
                y: Math.floor(base.y),
                z: Math.floor(base.z),
            };

            dimension.setBlockType(location, "minecraft:black_shulker_box");
            const block = dimension.getBlock(location);

            const shulkerInv = block?.getComponent("minecraft:inventory")?.container;

            if (!shulkerInv) break;

            for (let slot = 0; slot < shulkerInv.size && inventoryItems.length > 0; slot++) {
                const item = inventoryItems.shift();
                if (!item) continue;

                item.setLore([`§7Source: ${target.name}'s Inventory`]);

                shulkerInv.setItem(slot, item);
            }

            shulkerCount++;
            offset += 1;
        }

        if (shulkerCount > 0) {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Cloned "${target.name}'s" inventory into ${shulkerCount} shulker box(es).`);
        }
    },
};
