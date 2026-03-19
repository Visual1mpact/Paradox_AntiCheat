import { Player, ChatSendBeforeEvent, ItemStack, BlockVolume } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Represents the invclone command.
 * Clones a player's inventory into placed chests for inspection,
 * and allows removal of previously cloned chests via command or GUI.
 */
export const invCloneCommand: Command = {
    name: "invclone",
    description: "Clones the entire inventory of the specified player into chests for inspection or removes cloned chests.",
    usage: "{prefix}invclone <player>|remove",
    examples: [`{prefix}invclone PlayerName`, `{prefix}invclone remove`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/item_cell.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Cloner",
        description:
            "Clone a player's inventory into chests for inspection, or remove previously cloned chests.\n\n" + "§7• Cloned chests include lore indicating the source player.\n" + "§7• Use 'Remove Cloned Chests' after inspection to clear them safely.",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Clone Inventory",
                description: "Clone the inventory of a specified player",
                requiredFields: ["playerName"],
                icon: "textures/ui/icon_multiplayer.png",
                generateModalForm: true,
            },
            {
                name: "Remove Cloned Chests",
                description: "Remove all cloned inventory chests nearby",
                command: ["remove"],
                icon: "textures/ui/icon_trash.png",
                generateModalForm: false,
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
     * @param message The chat event that triggered the command.
     * @param args Command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        const dimension = message?.sender.dimension;
        const base = message?.sender.location;

        if (!message || !dimension || !base) return;

        // --- Removal logic if no args or 'remove' keyword ---
        if (!args?.length || args[0].toLowerCase() === "remove") {
            let removedCount = 0;
            const radius = 20; // configurable search radius

            for (let x = Math.floor(base.x - radius); x <= Math.floor(base.x + radius); x++) {
                for (let y = Math.floor(base.y - 5); y <= Math.floor(base.y + 5); y++) {
                    for (let z = Math.floor(base.z - radius); z <= Math.floor(base.z + radius); z++) {
                        const block = dimension.getBlock({ x, y, z });
                        const chestInv = block?.getComponent("minecraft:inventory")?.container;

                        if (chestInv && block?.typeId === "minecraft:chest") {
                            const firstItem = chestInv.getItem(0);
                            if (firstItem?.getLore()?.some((lore) => lore.includes("Source:"))) {
                                dimension.fillBlocks(new BlockVolume({ x, y, z }, { x, y, z }), "minecraft:air");
                                removedCount++;
                            }
                        }
                    }
                }
            }

            if (removedCount > 0) {
                const chestWord = removedCount === 1 ? "chest" : "chests";
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Removed ${removedCount} cloned ${chestWord}.`);
            } else {
                message.sender.sendMessage("§o§c[Paradox] No cloned chests found nearby.");
            }
            return;
        }

        // --- Inventory cloning logic ---
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

        const inventoryItems: ItemStack[] = [];
        for (let i = 0; i < targetInv.size; i++) {
            const item = targetInv.getItem(i);
            if (item) inventoryItems.push(item.clone());
        }

        // --- Early return if the inventory is empty ---
        if (inventoryItems.length === 0) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${target.name}" has an empty inventory. Nothing to clone.`);
            return;
        }

        let chestCount = 0;
        let offset = 1;

        while (inventoryItems.length > 0) {
            const location = {
                x: Math.floor(base.x) + offset,
                y: Math.floor(base.y),
                z: Math.floor(base.z),
            };

            dimension.setBlockType(location, "minecraft:chest");
            const block = dimension.getBlock(location);
            const chestInv = block?.getComponent("minecraft:inventory")?.container;
            if (!chestInv) break;

            for (let slot = 0; slot < chestInv.size && inventoryItems.length > 0; slot++) {
                const item = inventoryItems.shift();
                if (!item) continue;
                item.setLore([`§7Source: ${target.name}'s Inventory`]);
                chestInv.setItem(slot, item);
            }

            chestCount++;
            offset += 1;
        }

        if (chestCount > 0) {
            const chestWord = chestCount === 1 ? "chest" : "chests";
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Cloned "${target.name}'s" inventory into ${chestCount} ${chestWord}.`);
        }
    },
};
