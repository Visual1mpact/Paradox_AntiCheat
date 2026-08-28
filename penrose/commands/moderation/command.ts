import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { allCommands, commandHandler, disabledCommandsDB } from "../../event-listeners/world-initialize";

interface DisabledMetadata {
    disabledBy: string;
    timestamp: number;
}

interface CommandStatus {
    enabled: string[];
    disabled: { name: string; metadata: DisabledMetadata }[];
}

interface CommandBatchResults {
    disabledCommands: string[];
    alreadyDisabled: string[];
    enabledCommands: string[];
    alreadyEnabled: string[];
    invalidCommands: string[];
    notRegistered: string[];
}

type TreeItem = string | { name: string; metadata: DisabledMetadata };

/**
 * Converts epoch timestamp in milliseconds into a localized date/time string.
 *
 * @param {number} timestamp - Epoch time in milliseconds.
 * @returns {string} Formatted date and time string.
 */
function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

/**
 * Renders structured category sections as an ASCII tree formatted output message string.
 *
 * @param {{ title: string; items: TreeItem[] }[]} sections - Category sections containing items to display.
 * @returns {string} Formatted tree representation string.
 */
function buildTreeMessage(sections: { title: string; items: TreeItem[] }[]): string {
    let listMessage = "§2[§7Paradox§2]§o§7 Command Status:\n";
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
                listMessage += `§r  ${indent}${itemBranch} §2${item}§r\n`;
            } else {
                const { name, metadata } = item;
                const formattedTime = formatTimestamp(metadata.timestamp);
                listMessage += `§r  ${indent}${itemBranch} §2${name}§r §7(disabled by §o${metadata.disabledBy}§r§7 @ §o${formattedTime}§7)\n`;
            }
        });
    });

    return listMessage;
}

/**
 * Builds formatted output string summarizing batch command management actions.
 *
 * @param {CommandBatchResults} results - Accumulated execution results.
 * @returns {string} Tree formatted result overview message string.
 */
function buildBatchResultMessage(results: CommandBatchResults): string {
    let responseMessage = "§2[§7Paradox§2]§o§7 Command Management Results:\n";

    const sections = [
        ["Disabled", results.disabledCommands],
        ["Already Disabled", results.alreadyDisabled],
        ["Enabled", results.enabledCommands],
        ["Already Enabled", results.alreadyEnabled],
        ["Invalid", results.invalidCommands],
        ["Not Registered", results.notRegistered],
    ] as const;

    const nonEmptySections = sections.filter(([, arr]) => arr.length > 0);

    nonEmptySections.forEach(([title, items], index) => {
        const isLast = index === nonEmptySections.length - 1;
        const branchSymbol = isLast ? "└" : "├";
        responseMessage += `§r  ${branchSymbol} §2[§7${title}§2]§7\n`;

        items.forEach((name, i) => {
            const isLastItem = i === items.length - 1;
            const itemBranch = isLastItem ? "└" : "├";
            const indent = isLast ? "   " : "│  ";
            responseMessage += `§r  ${indent}${itemBranch} §2${name}§r\n`;
        });
    });

    return responseMessage;
}

/**
 * Categorizes all server commands into enabled and disabled states with associated metadata.
 *
 * @returns {Promise<CommandStatus>} Status payload containing enabled and disabled lists.
 */
async function fetchCommandStatus(): Promise<CommandStatus> {
    const registered = commandHandler.getRegisteredCommands().map((c) => c.name);
    const enabled: string[] = [];
    const disabled: { name: string; metadata: DisabledMetadata }[] = [];

    for (const cmd of allCommands) {
        if (registered.includes(cmd.name)) {
            enabled.push(cmd.name);
        } else {
            const meta = await disabledCommandsDB.get(cmd.name);
            if (meta) {
                disabled.push({ name: cmd.name, metadata: meta });
            }
        }
    }

    return { enabled, disabled };
}

/**
 * Processes a single request to disable a target command name.
 *
 * @param {string} commandName - Target command to disable.
 * @param {Command[]} registry - Mutable dynamic command handler registry array.
 * @param {string} senderName - Name of player executing command.
 * @param {CommandBatchResults} results - Results accumulator object.
 */
async function processDisableCommand(commandName: string, registry: Command[], senderName: string, results: CommandBatchResults): Promise<void> {
    const registeredCommand = registry.find((cmd) => cmd.name === commandName);

    if (!registeredCommand) {
        const existsInFullList = allCommands.some((cmd) => cmd.name === commandName);
        if (existsInFullList) {
            results.alreadyDisabled.push(commandName);
        } else {
            results.invalidCommands.push(commandName);
        }
        return;
    }

    const index = registry.indexOf(registeredCommand);
    if (index > -1) registry.splice(index, 1);

    await disabledCommandsDB.set(commandName, {
        disabledBy: senderName,
        timestamp: Date.now(),
    });

    results.disabledCommands.push(commandName);
}

/**
 * Processes a single request to enable a target command name.
 *
 * @param {string} commandName - Target command to enable.
 * @param {Command[]} registry - Mutable dynamic command handler registry array.
 * @param {CommandBatchResults} results - Results accumulator object.
 */
async function processEnableCommand(commandName: string, registry: Command[], results: CommandBatchResults): Promise<void> {
    const disabledMeta = await disabledCommandsDB.get(commandName);

    if (!disabledMeta) {
        const isAlreadyEnabled = registry.some((cmd) => cmd.name === commandName);
        const existsInFullList = allCommands.some((cmd) => cmd.name === commandName);

        if (!existsInFullList) {
            results.invalidCommands.push(commandName);
        } else if (isAlreadyEnabled) {
            results.alreadyEnabled.push(commandName);
        } else {
            results.notRegistered.push(commandName);
        }
        return;
    }

    const commandToRestore = allCommands.find((cmd) => cmd.name === commandName);
    if (!commandToRestore) {
        results.invalidCommands.push(commandName);
        return;
    }

    if (!registry.some((cmd) => cmd.name === commandToRestore.name)) {
        registry.push(commandToRestore);
    }

    await disabledCommandsDB.delete(commandName);
    results.enabledCommands.push(commandName);
}

/**
 * Command to dynamically enable, disable, or list other commands.
 * Admin clearance Level 4 bypasses disabled checks.
 */
export const command: Command = {
    name: "command",
    description: "Enable, disable, or list commands dynamically (Security Clearance 4 bypasses disabled status).",
    usage: "{prefix}command [ enable | disable | list ] <commandName1> [commandName2] ...",
    category: "Moderation",
    examples: [`{prefix}command disable kick ban`, `{prefix}command enable kick ban`, `{prefix}command list`],
    securityClearance: 4,
    icon: "textures/items/minecart_command_block.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Command Management",
        description:
            "Manage server commands dynamically. You can enable, disable, or view the status of commands.\n\n" +
            "§7• §fEnable Command§7: Reactivate one or more commands that are currently disabled.\n" +
            "§7• §fDisable Command§7: Temporarily deactivate commands to prevent their use.\n" +
            "§7• §fList Commands§7: View which commands are currently enabled or disabled.\n\n" +
            "§7Command Rules:\n" +
            "§7• The `command` command itself cannot be disabled.\n" +
            "§7• Security Clearance 4 admins bypass command restrictions and can execute disabled commands.\n" +
            "§7• Only valid commands in the registry can be enabled or disabled.\n" +
            "§7• Disabled commands record metadata including who disabled them and when.\n" +
            "§7• All results are displayed in a tree-style structured message.\n\n",
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

        const action = args[0]!.toLowerCase();

        if (action === "list") {
            const status = await fetchCommandStatus();
            const listMessage = buildTreeMessage([
                { title: "Enabled", items: status.enabled },
                { title: "Disabled", items: status.disabled },
            ]);
            message.sender.sendMessage(listMessage);
            return;
        }

        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: {prefix}command [enable|disable] <commandName1> [commandName2] ...");
            return;
        }

        const commandNames = args.slice(1);
        const registry = commandHandler.getRegisteredCommands();
        const results: CommandBatchResults = {
            disabledCommands: [],
            alreadyDisabled: [],
            enabledCommands: [],
            alreadyEnabled: [],
            invalidCommands: [],
            notRegistered: [],
        };

        for (const commandName of commandNames) {
            if (commandName === "command") {
                message.sender.sendMessage(`§o§c[Paradox] "${commandName}" cannot be disabled.`);
                continue;
            }

            if (action === "disable") {
                await processDisableCommand(commandName, registry, message.sender.name, results);
            } else if (action === "enable") {
                await processEnableCommand(commandName, registry, results);
            } else {
                results.invalidCommands.push(commandName);
            }
        }

        message.sender.sendMessage(buildBatchResultMessage(results));
        commandHandler.registerCommand(registry, allCommands);
    },
};
