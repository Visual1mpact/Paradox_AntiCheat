import { Player, ChatSendBeforeEvent, ItemStack, BlockVolume, EntityEnderInventoryComponent, EntityInventoryComponent, Dimension, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

/**
 * Removes nearby cloned chests that contain lore tagged with "Source:".
 * @param {Player} sender - Player issuing the command.
 * @param {Dimension} dimension - Target dimension instance.
 * @param {Vector3} base - Base coordinates for radius search.
 */
function removeClonedChests(sender: Player, dimension: Dimension, base: Vector3): void {
    let removedCount = 0;
    const radius = 20;

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
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Removed ${removedCount} cloned ${chestWord}.`);
    } else {
        sender.sendMessage("§o§c[Paradox] No cloned chests found nearby.");
    }
}

/**
 * Parses input arguments to separate target player name from ender chest flag.
 * @param {string[]} args - Input command arguments array.
 * @returns {{ playerName: string, isEnderChest: boolean }} Parsed arguments context.
 */
function parseCloneArgs(args: string[]): { playerName: string; isEnderChest: boolean } {
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

    return { playerName: playerName.trim(), isEnderChest };
}

/**
 * Retrieves all items present in target player's inventory or ender chest container.
 * @param {Player} target - The target player.
 * @param {boolean} isEnderChest - Ender chest retrieval flag.
 * @returns {ItemStack[] | null} Cloned item stacks list or null if inaccessible.
 */
function getTargetInventoryItems(target: Player, isEnderChest: boolean): ItemStack[] | null {
    const componentId = isEnderChest ? "minecraft:ender_inventory" : "minecraft:inventory";
    const invComp = target.getComponent(componentId) as EntityEnderInventoryComponent | EntityInventoryComponent;
    const targetInv = invComp?.container;

    if (!targetInv) return null;

    const inventoryItems: ItemStack[] = [];
    for (let i = 0; i < targetInv.size; i++) {
        const item = targetInv.getItem(i);
        if (item) inventoryItems.push(item.clone());
    }

    return inventoryItems;
}

/**
 * Places items into newly created chests starting adjacent to the base position.
 * @param {Dimension} dimension - Target dimension.
 * @param {Vector3} base - Origin placement position.
 * @param {ItemStack[]} items - Items to place.
 * @param {string} loreText - Lore metadata string to apply to items.
 * @returns {number} Count of chests created.
 */
function placeClonedChests(dimension: Dimension, base: Vector3, items: ItemStack[], loreText: string): number {
    let chestCount = 0;
    let offset = 1;

    while (items.length > 0) {
        const location = {
            x: Math.floor(base.x) + offset,
            y: Math.floor(base.y),
            z: Math.floor(base.z),
        };

        dimension.setBlockType(location, "minecraft:chest");
        const block = dimension.getBlock(location);
        const chestInv = block?.getComponent("minecraft:inventory")?.container;
        if (!chestInv) break;

        for (let slot = 0; slot < chestInv.size && items.length > 0; slot++) {
            const item = items.shift();
            if (!item) continue;
            item.setLore([loreText]);
            chestInv.setItem(slot, item);
        }

        chestCount++;
        offset += 1;
    }

    return chestCount;
}

/**
 * Executes target inventory cloning workflow.
 * @param {Player} sender - Command execution player.
 * @param {Dimension} dimension - Active dimension.
 * @param {Vector3} base - Position coordinate reference.
 * @param {string[]} args - Target arguments.
 */
function handleInventoryCloning(sender: Player, dimension: Dimension, base: Vector3, args: string[]): void {
    const { playerName, isEnderChest } = parseCloneArgs(args);
    const target = PlayerCache.getPlayerByName(playerName);

    if (!target || !target.isValid) {
        sender.sendMessage(`§o§c[Paradox] Failed to find player "${playerName}"!`);
        return;
    }

    const items = getTargetInventoryItems(target, isEnderChest);
    if (!items) {
        sender.sendMessage(`§o§c[Paradox] Cannot access ${target.name}'s ${isEnderChest ? "ender chest" : "inventory"}.`);
        return;
    }

    if (items.length === 0) {
        sender.sendMessage(`§o§c[Paradox] Player "${target.name}" has an empty ${isEnderChest ? "ender chest" : "inventory"}. Nothing to clone.`);
        return;
    }

    const loreText = `§7Source: ${target.name}'s ${isEnderChest ? "Ender Chest" : "Inventory"}`;
    const chestCount = placeClonedChests(dimension, base, items, loreText);

    if (chestCount > 0) {
        const chestWord = chestCount === 1 ? "chest" : "chests";
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Cloned "${target.name}'s" ${isEnderChest ? "ender chest" : "inventory"} into ${chestCount} ${chestWord}.`);
    }
}

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
     * @param {ChatSendBeforeEvent} [message] - The chat event that triggered the command.
     * @param {string[]} [args] - Command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args?: string[]): void => {
        if (!message?.sender) return;

        const senderTransform = PlayerLocationCache.getTransform(message.sender);
        const dimension = senderTransform?.dimension ?? message.sender.dimension;
        const base = senderTransform?.location ?? message.sender.location;

        if (!dimension || !base) return;

        if (!args?.length || args[0]?.toLowerCase() === "remove") {
            removeClonedChests(message.sender, dimension, base);
            return;
        }

        handleInventoryCloning(message.sender, dimension, base, args);
    },
};
