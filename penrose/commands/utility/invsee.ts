import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Represents the invsee command.
 */
export const invseeCommand: Command = {
    name: "invsee",
    description: "Shows the entire inventory of the specified player.",
    usage: "{prefix}invsee <player>",
    examples: [`{prefix}invsee PlayerName`, `{prefix}invsee help`],
    category: "Utility",
    securityClearance: 3,
    icon: "textures/items/minecart_chest.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Viewer",
        description: "View the inventory of another player.\n\n" + "§7• Select a player from the dropdown to display their items.\n" + "§7• You can see item type, quantity, and enchantments if present.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "View Inventory",
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
        ],
    },

    /**
     * Executes the invsee command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        // Check if message is provided
        if (!message || !args) {
            return;
        }

        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player | undefined {
            return PlayerCache.getPlayerByName(playerName);
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        // Join args to get the player name
        const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

        // Retrieve the player object
        const member: Player | undefined = getPlayerObject(playerName);

        // Retrieve the player's inventory
        if (member && member.isValid) {
            const inv = member.getComponent("inventory");
            if (!inv || !inv.container) {
                message.sender.sendMessage(`§o§c[Paradox] Failed to view inventory of "${member.name}§c"! Please try again.`);
                return;
            }
            const container = inv.container;

            // --- Efficient early exit if inventory is empty ---
            let hasItems = false;
            for (let i = 0; i < container.size; i++) {
                if (container.getItem(i)) {
                    hasItems = true;
                    break; // Stop immediately on first found item
                }
            }

            if (!hasItems) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${member.name}" has an empty inventory. Nothing to view.`);
                return;
            }

            // Display the player's inventory
            const inventoryMessage = [
                ` `,
                `§2[§7Paradox§2]§o§7 ${member.name}'s inventory:`,
                ...Array.from(Array(container.size), (_a, i) => {
                    let enchantmentInfo = "";
                    const item = container.getItem(i);
                    if (item) {
                        const enchantmentComponent = item.getComponent("enchantable");
                        if (enchantmentComponent) {
                            const enchantmentList = enchantmentComponent.getEnchantments();
                            if (enchantmentList.length > 0) {
                                const enchantmentLines = enchantmentList.map((enchantment) => `\n          └─ §2[§f${enchantment.type.id}§2] §7Level: §2${enchantment.level} §7/ §2${enchantment.type.maxLevel}\n`);
                                enchantmentInfo = `\n    └─ §2[§fEnchantments§2]${enchantmentLines.join("\n")}`;
                            }
                        }
                    }
                    const slotColor = item ? `§2[§fSlot ${i}§2]` : `§7[Slot ${i}]`;
                    const itemInfo = item ? `§2[§f${item.typeId.replace("minecraft:", "")}§2] §7Amount: §2x${item.amount}` : "§7(empty)";

                    return `  §o§7| ${slotColor} §2=>§f ${itemInfo}${enchantmentInfo}`;
                }),
                ` `,
            ];
            message.sender.sendMessage(inventoryMessage.join("\n"));
        } else {
            message.sender.sendMessage(`§o§c[Paradox] Failed to view inventory of "${member ? member.name + "§c" : playerName + "§c"}"! Please try again.`);
        }
    },
};
