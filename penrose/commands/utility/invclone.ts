import { Player, ChatSendBeforeEvent, ItemStack, BlockVolume, EntityEnderInventoryComponent, EntityInventoryComponent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

/**
 * Represents the invclone command.
 * Clones a player's inventory into placed chests for inspection,
 * and allows removal of previously cloned chests via command or GUI.
 */
export const invCloneCommand: Command = {
    name: "invclone",
    description: "Clones the entire inventory or ender chest of the specified player into chests for inspection or removes cloned chests.",
    usage: "{prefix}invclone <player> [--enderchest | -ec] | remove",
    examples: [`{prefix}invclone PlayerName`, `{prefix}invclone PlayerName --enderchest`, `{prefix}invclone remove`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/item_cell.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Cloner",
        description:
            "Manage physical clones of player inventories or ender chests for forensic inspection.\n\n" +
            "§7• Spawn chests at your location containing a player's full inventory or ender chest.\n" +
            "§7• Items are tagged with source metadata to identify the owner.\n" +
            "§7• Easily clear the area of cloned blocks after your review.\n\n",
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
            {
                name: "\nClone Ender Chest:",
                arg: "--enderchest",
                type: "toggle",
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
        if (!message || !message.sender) return;

        // Fetch sender's position and dimension from PlayerLocationCache
        const senderTransform = PlayerLocationCache.getTransform(message.sender);
        const dimension = senderTransform?.dimension ?? message.sender.dimension;
        const base = senderTransform?.location ?? message.sender.location;

        if (!dimension || !base) return;

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
        let playerName = "";
        let isEnderChest = false;
        const validFlags = new Set(["--enderchest", "-ec"]);

        for (const arg of args) {
            const sanitized = arg.replace(/["@]/g, "");
            if (validFlags.has(sanitized.toLowerCase())) {
                isEnderChest = true;
            } else {
                playerName += sanitized + " ";
            }
        }
        playerName = playerName.trim();

        const target: Player | undefined = PlayerCache.getPlayerByName(playerName);

        if (!target || !target.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Failed to find player "${playerName}"!`);
            return;
        }
        const invComp = target.getComponent(isEnderChest ? "minecraft:ender_inventory" : "minecraft:inventory") as EntityEnderInventoryComponent | EntityInventoryComponent;
        const targetInv = invComp?.container;
        if (!targetInv) {
            message.sender.sendMessage(`§o§c[Paradox] Cannot access ${target.name}'s ${isEnderChest ? "ender chest" : "inventory"}.`);
            return;
        }
        const inventoryItems: ItemStack[] = [];
        for (let i = 0; i < targetInv.size; i++) {
            const item = targetInv.getItem(i);
            if (item) inventoryItems.push(item.clone());
        }

        // --- Early return if the inventory is empty ---
        if (inventoryItems.length === 0) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${target.name}" has an empty ${isEnderChest ? "ender chest" : "inventory"}. Nothing to clone.`);
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
                item.setLore([`§7Source: ${target.name}'s ${isEnderChest ? "Ender Chest" : "Inventory"}`]);
                chestInv.setItem(slot, item);
            }

            chestCount++;
            offset += 1;
        }

        if (chestCount > 0) {
            const chestWord = chestCount === 1 ? "chest" : "chests";
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Cloned "${target.name}'s" ${isEnderChest ? "ender chest" : "inventory"} into ${chestCount} ${chestWord}.`);
        }
    },
};
