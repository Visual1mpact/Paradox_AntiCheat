import { Player, ChatSendBeforeEvent, EntityEnderInventoryComponent, EntityInventoryComponent, Container, ItemStack } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";

interface ParsedArguments {
    playerName: string;
    isEnderChest: boolean;
}

/**
 * Parses raw command arguments into a cleaned player name and ender chest flag indicator.
 *
 * @param {string[]} args - Raw argument string array.
 * @returns {ParsedArguments} Cleaned player name and boolean flag indicating ender chest mode.
 */
function parseArguments(args: string[]): ParsedArguments {
    let playerName = "";
    let isEnderChest = false;
    const validFlags = new Set(["--enderchest", "-ec"]);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]?.replace(/["@]/g, "") ?? "";
        if (validFlags.has(arg.toLowerCase())) {
            isEnderChest = true;
        } else {
            playerName += `${arg} `;
        }
    }

    return {
        playerName: playerName.trim(),
        isEnderChest,
    };
}

/**
 * Checks if a container contains at least one non-empty item slot.
 *
 * @param {Container} container - Target container component to inspect.
 * @returns {boolean} True if at least one item is present, false otherwise.
 */
function containerHasItems(container: Container): boolean {
    for (let i = 0; i < container.size; i++) {
        if (container.getItem(i)) {
            return true;
        }
    }
    return false;
}

/**
 * Formats enchantment metadata string for a given item stack if enchantments exist.
 *
 * @param {ItemStack} item - Target item stack to inspect.
 * @returns {string} Formatted enchantment text payload or empty string if none present.
 */
function formatEnchantments(item: ItemStack): string {
    const enchantmentComponent = item.getComponent("enchantable");
    if (!enchantmentComponent) return "";

    const enchantmentList = enchantmentComponent.getEnchantments();
    if (enchantmentList.length === 0) return "";

    const enchantmentLines = enchantmentList.map((enchantment) => `\n          └─ §2[§f${enchantment.type.id}§2] §7Level: §2${enchantment.level} §7/ §2${enchantment.type.maxLevel}\n`);

    return `\n    └─ §2[§fEnchantments§2]${enchantmentLines.join("\n")}`;
}

/**
 * Formats details for an individual container slot.
 *
 * @param {Container} container - Container holding the item.
 * @param {number} slotIndex - Slot index number.
 * @returns {string} Formatted slot display string.
 */
function formatSlotLine(container: Container, slotIndex: number): string {
    const item = container.getItem(slotIndex);
    const enchantmentInfo = item ? formatEnchantments(item) : "";
    const slotColor = item ? `§2[§fSlot ${slotIndex}§2]` : `§7[Slot ${slotIndex}]`;
    const itemInfo = item ? `§2[§f${item.typeId.replace("minecraft:", "")}§2] §7Amount: §2x${item.amount}` : "§7(empty)";

    return `  §o§7| ${slotColor} §2=>§f ${itemInfo}${enchantmentInfo}`;
}

/**
 * Renders the full inventory message output lines.
 *
 * @param {Player} targetPlayer - Target player object being viewed.
 * @param {Container} container - Target container holding items.
 * @param {boolean} isEnderChest - Whether viewing ender chest or main inventory.
 * @returns {string[]} Array of formatted string lines ready for sending.
 */
function buildInventoryMessage(targetPlayer: Player, container: Container, isEnderChest: boolean): string[] {
    const typeLabel = isEnderChest ? "ender chest" : "inventory";
    const lines: string[] = [" ", `§2[§7Paradox§2]§o§7 ${targetPlayer.name}'s ${typeLabel}:`];

    for (let i = 0; i < container.size; i++) {
        lines.push(formatSlotLine(container, i));
    }

    lines.push(" ");
    return lines;
}

/**
 * Process viewing a target player's inventory or ender chest.
 *
 * @param {Player} sender - Command execution sender.
 * @param {Player} targetPlayer - Player whose inventory is being inspected.
 * @param {boolean} isEnderChest - Whether to inspect ender chest.
 */
function displayPlayerInventory(sender: Player, targetPlayer: Player, isEnderChest: boolean): void {
    const componentId = isEnderChest ? "minecraft:ender_inventory" : "minecraft:inventory";
    const inv = targetPlayer.getComponent(componentId) as EntityEnderInventoryComponent | EntityInventoryComponent;

    if (!inv || !inv.container) return;

    const container = inv.container;

    if (!containerHasItems(container)) {
        const typeLabel = isEnderChest ? "ender chest" : "inventory";
        sender.sendMessage(`§o§c[Paradox] Player "${targetPlayer.name}" has an empty ${typeLabel}. Nothing to view.`);
        return;
    }

    const inventoryMessage = buildInventoryMessage(targetPlayer, container, isEnderChest);
    sender.sendMessage(inventoryMessage.join("\n"));
}

/**
 * Represents the invsee command.
 */
export const invseeCommand: Command = {
    name: "invsee",
    description: "Shows the entire inventory of the specified player.",
    usage: "{prefix}invsee <player> [--enderchest | -ec]",
    examples: [`{prefix}invsee PlayerName`, `{prefix}invsee PlayerName --enderchest`, `{prefix}invsee help`],
    category: "Utility",
    securityClearance: 3,
    icon: "textures/items/minecart_chest.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Viewer",
        description:
            "View the inventory or ender chest of another player.\n\n" +
            "§7• Select a player from the dropdown to display their items.\n" +
            "§7• Toggle 'View Ender Chest' to see their ender chest contents.\n" +
            "§7• You can see item type, quantity, and enchantments if present.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "View Inventory",
                icon: "textures/ui/inventory_icon.png",
                description: "Displays the inventory of a specified player",
                requiredFields: ["playerName"],
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
            {
                name: "\nView Ender Chest:",
                arg: "--enderchest",
                type: "toggle",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the invsee command.
     * @param {ChatSendBeforeEvent | undefined} message - The message event context.
     * @param {string[]} [args] - The command argument list.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        if (!message || !args) return;

        if (!args.length) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        const { playerName, isEnderChest } = parseArguments(args);
        const member = PlayerCache.getPlayerByName(playerName);

        if (member && member.isValid) {
            displayPlayerInventory(message.sender, member, isEnderChest);
        } else {
            const failName = member ? member.name + "§c" : playerName + "§c";
            message.sender.sendMessage(`§o§c[Paradox] Failed to view inventory of "${failName}"! Please try again.`);
        }
    },
};
