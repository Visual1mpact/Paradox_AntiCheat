import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { commandHandler } from "../../event-listeners/world-initialize";
import { disabledCommandsDB } from "../../event-listeners/world-initialize";

/**
 * Command to dynamically enable or disable other commands.
 */
export const command: Command = {
    name: "command",
    description: "Enable or disable commands dynamically.",
    usage: "{prefix}command [ enable | disable ] <commandName1> [commandName2] ...",
    category: "Moderation",
    examples: [`{prefix}command disable kick ban`, `{prefix}command enable kick ban`],
    securityClearance: 4,
    icon: "textures/items/minecart_command_block.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Command Management",
        description: "Select an action to enable or disable commands.\n\n",
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
        ],
        dynamicFields: [
            {
                name: "Commands to Enable / Disable:",
                arg: undefined,
                type: "text",
                placeholder: "Commands (space-separated)",
                requiredFields: ["commandNames"],
            },
        ],
    },

    /**
     * Executes the command to enable or disable multiple commands.
     *
     * @param {ChatSendBeforeEvent} message - The event triggered by a player's chat message.
     * @param {string[]} args - The arguments passed to the command.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        // Check if the user provided the required arguments
        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable] <commandName1> [commandName2] ...");
            return;
        }

        // Normalize the action for consistency
        const action = args[0].toLowerCase();
        const commandNames = args.slice(1);
        const commandHandlerRegistry = commandHandler.getRegisteredCommands();

        // Create arrays to hold commands for each status
        const notRegistered: string[] = [];
        const disabledCommands: string[] = [];
        const enabledCommands: string[] = [];
        const invalidCommands: string[] = [];

        // Process each command name
        commandNames.forEach(async (commandName) => {
            // Prevent disabling this command itself
            if (commandName === "command") {
                message.sender.sendMessage(`§o§c[Paradox] "${commandName}§c" cannot be disabled.`);
                return;
            }

            if (action === "disable") {
                // Check if the command is already registered
                const registeredCommand = commandHandlerRegistry.find((cmd) => cmd.name === commandName);
                if (!registeredCommand) {
                    notRegistered.push(commandName);
                    return;
                }

                // Remove the command from the registry
                const index = commandHandlerRegistry.indexOf(registeredCommand);
                if (index > -1) {
                    commandHandlerRegistry.splice(index, 1);
                }

                // Add the command to the disabled commands database
                await disabledCommandsDB.set(commandName, registeredCommand);
                disabledCommands.push(commandName);
            } else if (action === "enable") {
                const checkCommand = disabledCommandsDB.get<Command>(commandName);
                // Check if the command is in the disabled commands database
                if (!checkCommand) {
                    notRegistered.push(commandName);
                    return;
                }

                // Add the command back to the registry
                commandHandlerRegistry.push(checkCommand);

                // Remove the command from the disabled commands database
                disabledCommandsDB.delete(commandName);
                enabledCommands.push(commandName);
            } else {
                // Handle invalid action input
                invalidCommands.push(commandName);
            }
        });

        // Compile all messages into one response, formatted as a tree
        let responseMessage = "§2[§7Paradox§2]§o§7 Command Management Results:\n";

        /**
         * Generates a tree structure for a given section and its items.
         * The tree structure represents command categories (e.g., enable, disable, etc.)
         * and their respective commands, with special formatting for the last section.
         *
         * @param {string} action - The name of the action/category (e.g., "enable", "disable").
         * @param {string[]} items - A list of commands under the given action.
         * @param {boolean} [isLastBranch=false] - A flag indicating if this is the last section in the list.
         *
         * @returns {void} - This function modifies the global `responseMessage` variable by appending the generated tree structure.
         */
        const generateTreeBranch = (action: string, items: string[], isLastBranch: boolean = false): void => {
            if (items.length > 0) {
                // Adjusting tree structure for the last branch
                const branchPrefix = isLastBranch ? "└──" : "├──"; // Use '└──' for the last branch
                responseMessage += `§r   ${branchPrefix} §2[§7${action}§2]§7\n`;

                items.forEach((cmd, index) => {
                    // Check if this is the last item in the list to use '└──' for the last item
                    const isLastItem = index === items.length - 1;
                    const treeBranch = isLastItem ? "└──" : "├──";

                    // Add the appropriate indentation and the command
                    responseMessage += `§r   ${isLastBranch ? "    " : "│   "} ${treeBranch} §2${cmd}§r\n`;
                });
            }
        };

        const sections = [
            { action: "Enable", items: enabledCommands },
            { action: "Disable", items: disabledCommands },
            { action: "Not Registered", items: notRegistered },
            { action: "Invalid Commands", items: invalidCommands },
        ];

        // Filter out empty sections
        const populatedSections = sections.filter((section) => section.items.length > 0);

        // Loop through populated sections and call generateTreeBranch with the appropriate last branch flag
        populatedSections.forEach((section, index) => {
            const isLastBranch = index === populatedSections.length - 1;
            generateTreeBranch(section.action, section.items, isLastBranch);
        });

        // Send the final compiled message
        message.sender.sendMessage(responseMessage);

        // Re-register the updated command list
        commandHandler.registerCommand(commandHandlerRegistry);
    },
};
