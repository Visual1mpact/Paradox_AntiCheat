import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { allCommands, commandHandler } from "../../event-listeners/world-initialize";
import { disabledCommandsDB } from "../../event-listeners/world-initialize";

/**
 * Command to dynamically enable or disable other commands.
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
     * Executes the command to enable, disable, or list commands.
     *
     * @param {ChatSendBeforeEvent} message - The event triggered by a player's chat message.
     * @param {string[]} args - The arguments passed to the command.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        if (args.length < 1) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable|list] <commandName1> [commandName2] ...");
            return;
        }

        const action = args[0].toLowerCase(); // "enable", "disable", or "list"

        if (action === "list") {
            const registered = commandHandler.getRegisteredCommands().map((c) => c.name);
            const enabled: string[] = [];
            const disabled: string[] = [];

            for (const cmd of allCommands) {
                if (registered.includes(cmd.name)) {
                    enabled.push(cmd.name);
                } else {
                    disabled.push(cmd.name);
                }
            }

            let listMessage = "§2[§7Paradox§2]§o§7 Command Status:\n";

            const generateTreeBranch = (title: string, items: string[], isLastBranch = false) => {
                if (items.length === 0) return;
                const branchPrefix = isLastBranch ? "└" : "├";
                listMessage += `§r  ${branchPrefix} §2[§7${title}§2]§7\n`;
                items.forEach((cmd, i) => {
                    const treeBranch = i === items.length - 1 ? "└" : "├";
                    listMessage += `§r  ${isLastBranch ? "   " : "│  "} ${treeBranch} §2${cmd}§r\n`;
                });
            };

            const sections = [
                { title: "Enabled", items: enabled },
                { title: "Disabled", items: disabled },
            ];

            sections.forEach((section, idx) => {
                generateTreeBranch(section.title, section.items, idx === sections.length - 1);
            });

            message.sender.sendMessage(listMessage);
            return;
        }

        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable] <commandName1> [commandName2] ...");
            return;
        }

        const commandNames = args.slice(1); // command names to process
        const commandHandlerRegistry = commandHandler.getRegisteredCommands(); // active registered commands

        // Arrays to collect outcomes
        const notRegistered: string[] = [];
        const disabledCommands: string[] = [];
        const enabledCommands: string[] = [];
        const invalidCommands: string[] = [];
        const alreadyDisabled: string[] = [];
        const alreadyEnabled: string[] = [];

        const fullCommandList = allCommands; // All possible commands including disabled

        for (const commandName of commandNames) {
            if (commandName === "command") {
                // Don't allow disabling the command manager
                message.sender.sendMessage(`§o§c[Paradox] "${commandName}" cannot be disabled.`);
                continue;
            }

            if (action === "disable") {
                const registeredCommand = commandHandlerRegistry.find((cmd) => cmd.name === commandName);

                if (!registeredCommand) {
                    // Already disabled or doesn't exist
                    const existsInFullList = fullCommandList.some((cmd) => cmd.name === commandName);
                    if (existsInFullList) {
                        alreadyDisabled.push(commandName);
                    } else {
                        invalidCommands.push(commandName);
                    }
                    continue;
                }

                // Remove from the active registry
                const index = commandHandlerRegistry.indexOf(registeredCommand);
                if (index > -1) commandHandlerRegistry.splice(index, 1);

                // Persist disabled metadata
                await disabledCommandsDB.set(commandName, {
                    disabledBy: message.sender.name,
                    timestamp: Date.now(),
                });

                disabledCommands.push(commandName);
            } else if (action === "enable") {
                const disabledMeta = disabledCommandsDB.get(commandName);

                if (!disabledMeta) {
                    // Already enabled or never existed
                    const isAlreadyEnabled = commandHandlerRegistry.some((cmd) => cmd.name === commandName);
                    const existsInFullList = fullCommandList.some((cmd) => cmd.name === commandName);

                    if (!existsInFullList) {
                        invalidCommands.push(commandName); // not even a valid command
                    } else if (isAlreadyEnabled) {
                        alreadyEnabled.push(commandName);
                    } else {
                        notRegistered.push(commandName);
                    }

                    continue;
                }

                // Restore from full command list
                const commandToRestore = fullCommandList.find((cmd) => cmd.name === commandName);

                if (!commandToRestore) {
                    invalidCommands.push(commandName); // does not exist anymore
                    continue;
                }

                if (!commandHandlerRegistry.some((cmd) => cmd.name === commandToRestore.name)) {
                    commandHandlerRegistry.push(commandToRestore);
                }

                await disabledCommandsDB.delete(commandName);
                enabledCommands.push(commandName);
            } else {
                invalidCommands.push(commandName); // not a valid action
            }
        }

        // Construct structured response
        let responseMessage = "§2[§7Paradox§2]§o§7 Command Management Results:\n";

        /**
         * Renders a section in a tree format.
         *
         * @param action - Title of the section (e.g. Enable, Disable, etc.)
         * @param items - List of command names for this section
         * @param isLastBranch - Whether this is the last section for formatting
         */
        const generateTreeBranch = (action: string, items: string[], isLastBranch: boolean = false): void => {
            if (items.length > 0) {
                const branchPrefix = isLastBranch ? "└" : "├";
                responseMessage += `§r  ${branchPrefix} §2[§7${action}§2]§7\n`;

                items.forEach((cmd, index) => {
                    const isLastItem = index === items.length - 1;
                    const treeBranch = isLastItem ? "└" : "├";
                    responseMessage += `§r  ${isLastBranch ? "   " : "│  "} ${treeBranch} §2${cmd}§r\n`;
                });
            }
        };

        // Compose all sections to include
        const sections = [
            { action: "Enabled", items: enabledCommands },
            { action: "Disabled", items: disabledCommands },
            { action: "Already Enabled", items: alreadyEnabled },
            { action: "Already Disabled", items: alreadyDisabled },
            { action: "Not Registered", items: notRegistered },
            { action: "Invalid", items: invalidCommands },
        ];

        const populatedSections = sections.filter((section) => section.items.length > 0);
        populatedSections.forEach((section, index) => {
            const isLastBranch = index === populatedSections.length - 1;
            generateTreeBranch(section.action, section.items, isLastBranch);
        });

        // Return results to player
        message.sender.sendMessage(responseMessage);

        // Re-register the updated command list
        commandHandler.registerCommand(commandHandlerRegistry);
    },
};
