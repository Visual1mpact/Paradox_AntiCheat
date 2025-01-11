import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { commandHandler } from "../../paradox";
import { disabledCommandsDB } from "../../paradox";

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
    icon: "textures/items/lever.png",

    /**
     * Executes the command to enable or disable multiple commands.
     *
     * @param {ChatSendBeforeEvent} message - The event triggered by a player's chat message.
     * @param {string[]} args - The arguments passed to the command.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        // Check if the user provided the required arguments
        if (args.length < 2) {
            message.sender.sendMessage("§cUsage: {prefix}command [enable|disable] <commandName1> [commandName2] ...");
            return;
        }

        // Normalize the action for consistency
        const action = args[0].toLowerCase();
        const commandNames = args.slice(1);
        const commandHandlerRegistry = commandHandler.getRegisteredCommands();

        // Process each command name
        commandNames.forEach((commandName) => {
            // Prevent disabling this command itself
            if (commandName === "command") {
                message.sender.sendMessage(`§c"${commandName}" cannot be disabled.`);
                return;
            }

            if (action === "disable") {
                // Check if the command is already registered
                const registeredCommand = commandHandlerRegistry.find((cmd) => cmd.name === commandName);
                if (!registeredCommand) {
                    message.sender.sendMessage(`§cCommand "${commandName}" is not registered.`);
                    return;
                }

                // Remove the command from the registry
                const index = commandHandlerRegistry.indexOf(registeredCommand);
                if (index > -1) {
                    commandHandlerRegistry.splice(index, 1);
                }

                // Add the command to the disabled commands database
                disabledCommandsDB.set(commandName, registeredCommand);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Command "${commandName}" has been disabled.`);
            } else if (action === "enable") {
                const checkCommand = disabledCommandsDB.get<Command>(commandName);
                // Check if the command is in the disabled commands database
                if (!checkCommand) {
                    message.sender.sendMessage(`§cCommand "${commandName}" is not disabled or does not exist.`);
                    return;
                }

                // Add the command back to the registry
                commandHandlerRegistry.push(checkCommand);

                // Remove the command from the disabled commands database
                disabledCommandsDB.delete(commandName);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Command "${commandName}" has been enabled.`);
            } else {
                // Handle invalid action input
                message.sender.sendMessage("§cInvalid action. Use 'enable' or 'disable'.");
            }
        });

        // Re-register the updated command list
        commandHandler.registerCommand(commandHandlerRegistry);
    },
};
