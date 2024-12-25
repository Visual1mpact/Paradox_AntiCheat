import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Viewer",
        description: "View another player's inventory.",
        commandOrder: undefined,
        actions: [
            {
                name: "View Inventory",
                command: undefined,
                description: "Displays the inventory of a specified player",
                requiredFields: ["playerName"],
                crypto: false,
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "Name of Player",
                arg: undefined,
                type: "dropdown",
                placeholder: "Select Players Name:",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the invsee command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§cPlease provide a player name.");
            return;
        }

        // Join args to get the player name
        const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

        // Retrieve the player object
        const member: Player | undefined = getPlayerObject(playerName);

        // Retrieve the player's inventory
        system.run(() => {
            if (member && member.isValid()) {
                const inv = member.getComponent("inventory");
                const container = inv.container;
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
                message.sender.sendMessage(`§cFailed to view inventory of "${member ? member.name : playerName}"! Please try again.`);
            }
        });
    },
};
