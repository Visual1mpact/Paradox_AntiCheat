import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { allCommands, commandHandler } from "../../event-listeners/world-initialize";
import { disabledCommandsDB } from "../../event-listeners/world-initialize";

/**
 * Command to dynamically enable, disable, or list other commands.
 */
export const command: Command = {
    name: "command",
    description: "Enable, disable, or list commands dynamically.",
    usage: "{prefix}command [ enable | disable | list ] <commandName1> [commandName2] ...",
    category: "Moderation",
    examples: [`{prefix}command disable kick ban`, `{prefix}command enable kick ban`, `{prefix}command list`],
    securityClearance: 4,
    icon: "textures/items/minecart_command_block.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Command Management",
        description: "Select an action to enable, disable, or list commands.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable Command",
                command: ["enable"],
                description: "Enable one or more commands that are currently disabled.",
                requiredFields: ["commandNames"],
                crypto: false,
                generateModalForm: true,
                icon: "textures/ui/realms_green_check.png",
            },
            {
                name: "Disable Command",
                command: ["disable"],
                description: "Disable one or more commands, preventing them from being used.",
                requiredFields: ["commandNames"],
                crypto: false,
                generateModalForm: true,
                icon: "textures/ui/realms_red_x.png",
            },
            {
                name: "List Commands",
                command: ["list"],
                description: "List all currently enabled and disabled commands.",
                generateModalForm: false,
                icon: "textures/ui/magnifyingGlass.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nCommands to Enable / Disable:",
                type: "text",
                placeholder: "Commands (space-separated)",
                requiredFields: ["commandNames"],
            },
        ],
    },

    /**
     * Executes the `command` command.
     * Handles subcommands: enable, disable, list.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The chat event triggered by the player.
     * @param {string[]} args - The command arguments provided by the player.
     * @returns {Promise<void>}
     */
    async execute(message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> {
        if (!message) return;
        if (args.length < 1) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable|list] <commandName1> [commandName2] ...");
            return;
        }

        const action = args[0].toLowerCase();

        if (action === "list") {
            const registered = commandHandler.getRegisteredCommands().map((c) => c.name);
            const enabled: string[] = [];
            const disabled: { name: string; metadata: { disabledBy: string; timestamp: number } }[] = [];

            // Categorize commands
            for (const cmd of allCommands) {
                if (registered.includes(cmd.name)) {
                    enabled.push(cmd.name);
                } else {
                    const meta = disabledCommandsDB.get(cmd.name);
                    if (meta) {
                        disabled.push({ name: cmd.name, metadata: meta });
                    }
                }
            }

            let listMessage = "§2[§7Paradox§2]§o§7 Command Status:\n";

            /**
             * Formats a timestamp into a readable string.
             *
             * @param timestamp - UNIX timestamp in milliseconds
             * @returns Formatted string
             */
            const formatTimestamp = (timestamp: number): string => {
                const date = new Date(timestamp);
                return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            };

            /**
             * Represents an individual item in the tree. It can either be:
             * - a plain string (for enabled items), or
             * - an object containing metadata about who disabled the item and when.
             */
            type TreeItem = string | { name: string; metadata: { disabledBy: string; timestamp: number } };

            /**
             * Generates a formatted tree-style message with multiple titled sections.
             * Skips any section that has no items.
             * Each section is rendered with a tree branch prefix and indented list items.
             * If an item includes metadata, additional context is shown (e.g., who disabled it and when).
             *
             * @param sections - An array of section objects, each with a title and list of items.
             */
            const generateTreeMessage = (sections: { title: string; items: TreeItem[] }[]) => {
                // Filter out sections with no items
                const filteredSections = sections.filter((section) => section.items.length > 0);

                filteredSections.forEach((section, index) => {
                    const isLastSection = index === filteredSections.length - 1;
                    const branchSymbol = isLastSection ? "└" : "├";
                    listMessage += `§r  ${branchSymbol} §2[§7${section.title}§2]§7\n`;

                    section.items.forEach((item, i) => {
                        const isLastItem = i === section.items.length - 1;
                        const itemBranch = isLastItem ? "└" : "├";
                        const indent = isLastSection ? "   " : "│  ";

                        if (typeof item === "string") {
                            // Plain item with no metadata
                            listMessage += `§r  ${indent}${itemBranch} §2${item}§r\n`;
                        } else {
                            // Item with metadata, show who disabled it and when
                            const { name, metadata } = item;
                            const formattedTime = formatTimestamp(metadata.timestamp);
                            listMessage += `§r  ${indent}${itemBranch} §2${name}§r §7(disabled by §o${metadata.disabledBy}§r§7 @ §o${formattedTime}§7)\n`;
                        }
                    });
                });
            };

            generateTreeMessage([
                { title: "Enabled", items: enabled },
                { title: "Disabled", items: disabled },
            ]);

            message.sender.sendMessage(listMessage);
            return;
        }

        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable] <commandName1> [commandName2] ...");
            return;
        }

        const commandNames = args.slice(1);
        const commandHandlerRegistry = commandHandler.getRegisteredCommands();

        // Prepare tracking arrays for results
        const notRegistered: string[] = [];
        const disabledCommands: string[] = [];
        const enabledCommands: string[] = [];
        const invalidCommands: string[] = [];
        const alreadyDisabled: string[] = [];
        const alreadyEnabled: string[] = [];

        const fullCommandList = allCommands;

        for (const commandName of commandNames) {
            if (commandName === "command") {
                message.sender.sendMessage(`§o§c[Paradox] "${commandName}" cannot be disabled.`);
                continue;
            }

            if (action === "disable") {
                const registeredCommand = commandHandlerRegistry.find((cmd) => cmd.name === commandName);

                if (!registeredCommand) {
                    const existsInFullList = fullCommandList.some((cmd) => cmd.name === commandName);
                    if (existsInFullList) {
                        alreadyDisabled.push(commandName);
                    } else {
                        invalidCommands.push(commandName);
                    }
                    continue;
                }

                // Remove from the registry and store metadata
                const index = commandHandlerRegistry.indexOf(registeredCommand);
                if (index > -1) commandHandlerRegistry.splice(index, 1);

                await disabledCommandsDB.set(commandName, {
                    disabledBy: message.sender.name,
                    timestamp: Date.now(),
                });

                disabledCommands.push(commandName);
            } else if (action === "enable") {
                const disabledMeta = disabledCommandsDB.get(commandName);

                if (!disabledMeta) {
                    const isAlreadyEnabled = commandHandlerRegistry.some((cmd) => cmd.name === commandName);
                    const existsInFullList = fullCommandList.some((cmd) => cmd.name === commandName);

                    if (!existsInFullList) {
                        invalidCommands.push(commandName);
                    } else if (isAlreadyEnabled) {
                        alreadyEnabled.push(commandName);
                    } else {
                        notRegistered.push(commandName);
                    }

                    continue;
                }

                const commandToRestore = fullCommandList.find((cmd) => cmd.name === commandName);
                if (!commandToRestore) {
                    invalidCommands.push(commandName);
                    continue;
                }

                if (!commandHandlerRegistry.some((cmd) => cmd.name === commandToRestore.name)) {
                    commandHandlerRegistry.push(commandToRestore);
                }

                await disabledCommandsDB.delete(commandName);
                enabledCommands.push(commandName);
            } else {
                invalidCommands.push(commandName);
            }
        }

        // Build structured feedback message
        let responseMessage = "§2[§7Paradox§2]§o§7 Command Management Results:\n";

        /**
         * Adds a tree-style result section to the response message.
         *
         * @param title - Section title
         * @param items - List of command names
         * @param isLastBranch - Whether this is the last main section
         */
        const appendResultBranch = (title: string, items: string[], isLastBranch = false) => {
            if (items.length === 0) return;
            const branchSymbol = isLastBranch ? "└" : "├";
            responseMessage += `§r  ${branchSymbol} §2[§7${title}§2]§7\n`;
            items.forEach((name, i) => {
                const isLastItem = i === items.length - 1;
                const itemBranch = isLastItem ? "└" : "├";
                const indent = isLastBranch ? "   " : "│  ";
                responseMessage += `§r  ${indent}${itemBranch} §2${name}§r\n`;
            });
        };

        // Determine which section is last for formatting
        const sections = [
            ["Disabled", disabledCommands],
            ["Already Disabled", alreadyDisabled],
            ["Enabled", enabledCommands],
            ["Already Enabled", alreadyEnabled],
            ["Invalid", invalidCommands],
            ["Not Registered", notRegistered],
        ] as const;

        const nonEmptySections = sections.filter(([, arr]) => arr.length > 0);

        nonEmptySections.forEach(([title, items], index) => {
            const isLast = index === nonEmptySections.length - 1;
            appendResultBranch(title, items, isLast);
        });

        message.sender.sendMessage(responseMessage);

        // Re-apply command handler registry
        commandHandler.registerCommand(commandHandlerRegistry);
    },
};
