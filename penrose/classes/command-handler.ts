import { Player, ChatSendBeforeEvent, system, world, PlayerSpawnAfterEvent } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";

/**
 * Enum representing different levels of security clearance for commands.
 */
enum SecurityClearance {
    Level1 = 1,
    Level2 = 2,
    Level3 = 3,
    Level4 = 4,
}

/**
 * Type representing the form type for GUI instructions.
 * This determines the kind of form to generate:
 * - `"ActionFormData"`: A simple form with action buttons.
 * - `"ModalFormData"`: A more complex form with input fields (text, dropdown, toggle).
 * - `"MessageFormData"`: A form to display a simple message without interactivity.
 */
type FormType = "ActionFormData" | "ModalFormData" | "MessageFormData";

/**
 * Represents a button in an action form, used in ActionFormData GUI type.
 * This is used to define buttons that the player can click to trigger actions.
 */
export interface ActionFormButton {
    /**
     * The display name of the button.
     * This will be shown to the player as the label for the button.
     * Example: `"Start Game"`, `"Settings"`.
     */
    name: string;

    /**
     * The command(s) to execute when the button is pressed.
     * This is an array of strings representing the commands.
     * Example: `["startGame"]`, `["openSettings"]`.
     */
    command: string[];

    /**
     * An optional description for additional context about the button's function.
     * This will provide players with more information about what the button does.
     * Example: `"Begin your adventure"`.
     */
    description?: string;

    /**
     * Optional list of required dynamic fields for the button.
     * These fields must be filled before the button's command can be executed.
     * Example: `["playerName"]`.
     */
    requiredFields?: string[];

    /**
     * Whether this button requires crypto instructions.
     * If true, the form will handle crypto-related interactions.
     */
    crypto?: boolean;

    /**
     * Whether pressing this button should trigger the generation of a modal form.
     * If true, a modal form will be shown when the button is clicked.
     */
    generateModalForm?: boolean;

    /**
     * Optional icon for the button. This can be a Minecraft texture path.
     * If provided, it will display an icon alongside the button's name.
     */
    icon?: string;

    /**
     * Whether the button should trigger the generation of sub-actions.
     * If true, additional actions will be shown when the button is clicked.
     */
    generateSubActions?: boolean;

    /**
     * Optional list of sub-actions for this button.
     * Each sub-action is an additional action that can be executed after the main button is clicked.
     */
    subActions?: ActionFormButton[];
}

/**
 * Represents an input field in a form, used in ModalFormData GUI type.
 * This defines the type and behavior of input fields in modal forms.
 */
export interface DynamicField {
    /**
     * The name or label of the field.
     * This will be displayed as the prompt above the field.
     * Example: `"Player Name"`, `"Select Difficulty"`.
     */
    name: string;

    /**
     * The argument to pass back to the command.
     * This can be used to map the field value to a command argument.
     */
    arg?: string;

    /**
     * The type of input field.
     * Options are:
     * - `"text"`: A text input.
     * - `"dropdown"`: A dropdown menu.
     * - `"toggle"`: A toggle switch.
     */
    type: "text" | "dropdown" | "toggle";

    /**
     * Placeholder text for text fields.
     * This is shown in the text input field when it's empty.
     * Example: `"Enter your name here"`.
     */
    placeholder?: string;

    /**
     * Options for dropdown-type fields.
     * An array of strings representing the available options in the dropdown.
     * Example: `["Easy", "Medium", "Hard"]`.
     */
    options?: string[];

    /**
     * Optional list of required dynamic fields for the button.
     * These fields must be filled before the button's command can be executed.
     * Example: `["playerName"]`.
     */
    requiredFields?: string[];
}

/**
 * Interface for the GUI instructions associated with a command.
 * This defines how to create a GUI form with various input fields, buttons, and titles.
 */
export interface GuiInstructions {
    /**
     * Type of form to generate. Choose from:
     * - `"ActionFormData"`: A form with action buttons.
     * - `"ModalFormData"`: A form with input fields for user interaction.
     * - `"MessageFormData"`: A simple message form.
     */
    formType: FormType;

    /**
     * The title displayed at the top of the form.
     * Example: `"Main Menu"`, `"Settings"`.
     */
    title: string;

    /**
     * Optional description or context displayed below the title.
     * This can help guide the player on how to use the form.
     * Example: `"Please select an option from the menu."`.
     */
    description?: string;

    /**
     * Order for appending the command and arguments.
     * Options are:
     * - `"command-arg"`: Command first, then argument.
     * - `"arg-command"`: Argument first, then command.
     * If `undefined`, the default order will be used.
     */
    commandOrder?: "command-arg" | "arg-command" | undefined;

    /**
     * List of buttons for ActionFormData forms.
     * Each button has a `name` (label) and a `command` (action to execute).
     * Each button can also have a `description`, `requiredFields`, and `crypto` flag.
     */
    actions?: ActionFormButton[];

    /**
     * List of input fields for ModalFormData forms.
     * Each field can be a `text` input, `dropdown` selection, or a `toggle` switch.
     */
    dynamicFields?: DynamicField[];
}

/**
 * Interface representing a command in the command handler system.
 * A command is an action that can be executed by the player, often triggered through chat.
 */
export interface Command {
    /**
     * The name of the command.
     * This is the keyword that players will type to invoke the command.
     * Example: `"teleport"`, `"ban"`, `"opengui"`.
     */
    name: string;

    /**
     * A brief description of the command's functionality.
     * This provides the player with an overview of what the command does.
     * Example: `"Teleports the player to a specified location"`.
     */
    description: string;

    /**
     * An optional special note for the command.
     * This can be used to provide additional context or warnings about using the command.
     * Example: `"This command is restricted to admins only"`.
     */
    specialNote?: string;

    /**
     * The usage pattern for the command.
     * This shows players how to use the command, including any required arguments.
     * Example: `"!teleport <player> <location>"`.
     */
    usage: string;

    /**
     * Example usages of the command.
     * This provides players with sample inputs that will work with the command.
     * Example: `["!teleport Steve Spawn"]`.
     */
    examples: string[];

    /**
     * The category the command belongs to.
     * Commands can be categorized for easier navigation, like `"Utility"`, `"Moderation"`, etc.
     * Example: `"Utility"`, `"Moderation"`, `"Combat"`.
     */
    category: string;

    /**
     * The security clearance level required to execute the command.
     * This determines who has permission to run the command based on their security clearance.
     * Example: `1` for regular players, `4` for admins, etc.
     */
    securityClearance: SecurityClearance;

    /**
     * Optional icon for the button. This can be a Minecraft texture path.
     * If provided, it will display an icon alongside the button's name.
     */
    icon?: string;

    /**
     * Optional instructions for generating a GUI associated with the command.
     * If specified, this will be used to create a GUI when the command is executed.
     * The `GuiInstructions` object provides details on the form type, buttons, dynamic fields, etc.
     */
    guiInstructions?: GuiInstructions;

    /**
     * The function that is executed when the command is run.
     * This function will handle the logic of the command, including any parameters passed in.
     * The function signature includes:
     * - `message`: The message object that triggered the command.
     * - `args`: The arguments passed to the command (optional).
     * - `cryptoES`: A reference to the CryptoES library (optional).
     * - `returnMonitorFunction`: A flag to indicate if the return monitor should be executed (optional).
     *
     * The return value can either be:
     * - A promise that resolves when the command finishes (useful for asynchronous operations).
     * - A void function that runs synchronously.
     * - A function that handles `PlayerSpawnAfterEvent` for specific scenarios.
     *
     * @example
     * execute: (message, args) => {
     *     // Command logic here
     * };
     */
    execute: (message: ChatSendBeforeEvent, args?: string[], cryptoES?: typeof CryptoES, returnMonitorFunction?: boolean) => Promise<void | boolean> | void | ((object: PlayerSpawnAfterEvent) => void);
}

/**
 * Class responsible for handling commands in the Minecraft environment.
 */
export class CommandHandler {
    private commandsByCategory: Map<string, Command[]> = new Map();
    private commands: Map<string, Command> = new Map();
    private prefix: string;
    private prefixLock: boolean = false;
    private prefixUpdateLock: boolean = false;
    private readonly rateLimitInterval: number = 20; // 20 ticks equals 1 second
    private readonly maxCommandsPerInterval: number = 5;
    private commandCount: number = 0;
    private lastCommandTimestamp: number = 0;

    /**
     * Constructs a CommandHandler.
     */
    constructor() {
        this.prefix = (world.getDynamicProperty("__prefix") as string) || "!";
    }

    /**
     * Registers an array of commands.
     * Clears any previously registered commands to prevent duplication.
     * @param commands - The commands to register.
     */
    registerCommand(commands: Command[]) {
        // Clear previously registered commands
        this.commands.clear();
        this.commandsByCategory.clear();

        commands.forEach((command) => {
            // Update the command's usage and examples with the current prefix
            command.usage = command.usage.replaceAll("{prefix}", this.prefix);
            command.examples = command.examples.map((example) => example.replace("{prefix}", this.prefix));

            // Categorize the command
            const category = command.category.charAt(0).toUpperCase() + command.category.slice(1).toLowerCase();
            const categoryCommands = this.commandsByCategory.get(category) || [];
            categoryCommands.push(command);
            this.commandsByCategory.set(category, categoryCommands);

            // Store the command in the commands map
            this.commands.set(command.name.toLowerCase(), command);
        });
    }

    /**
     * Retrieves all registered commands.
     * @returns - An array of all registered commands.
     */
    getRegisteredCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Handles an incoming chat message to potentially execute a command.
     * @param message - The chat message event.
     * @param player - The player who sent the message.
     */
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        const defaultPrefix = (world.getDynamicProperty("__prefix") as string) || "!";
        if (!message.message.startsWith(defaultPrefix)) {
            // message.cancel = false;
            return false; // Indicate that a command was not handled
        }

        if (!this.canExecuteCommand()) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Commands are being rate-limited. Please wait before sending another command.");
            return true; // Indicate that a command was handled
        }

        this.acquireCommandExecutionLock();

        let verifyPrefixUpdate: boolean = false;

        try {
            const args = message.message.slice(defaultPrefix.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase();

            if (commandName) {
                const result = this.executeCommand(message, player, commandName, args, defaultPrefix);
                if (result === true) {
                    verifyPrefixUpdate = true;
                }
            }
        } finally {
            if (verifyPrefixUpdate) {
                this.updatePrefix(player);
            }
            this.releaseCommandExecutionLock();
        }

        return true; // Indicate that a command was handled
    }

    /**
     * Updates the prefix used for commands.
     * @param player - The player requesting the prefix update.
     */
    updatePrefix(player: Player) {
        if (this.prefixUpdateLock) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Cannot update prefix while another update is in progress.");
            return;
        }

        this.prefixUpdateLock = true;
        system.run(async () => {
            const newPrefix = world.getDynamicProperty("__prefix") as string;
            try {
                for (const command of this.commands.values()) {
                    command.usage = command.usage.replaceAll(this.prefix + command.name, newPrefix + command.name);
                    command.examples = command.examples.map((example: string) => example.replace(this.prefix + command.name, newPrefix + command.name));
                }
                this.prefix = newPrefix;
            } finally {
                this.prefixUpdateLock = false;
            }
        });
    }

    /**
     * Acquires a lock to ensure that command execution is serialized.
     */
    private async acquireCommandExecutionLock() {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => system.runTimeout(() => resolve(), 100));
        }
        this.prefixLock = true;
    }

    /**
     * Releases the command execution lock.
     */
    private releaseCommandExecutionLock() {
        this.prefixLock = false;
    }

    /**
     * Executes a command based on the message and player input.
     * @param message - The chat message event.
     * @param player - The player who sent the message.
     * @param commandName - The name of the command to execute.
     * @param args - The arguments provided with the command.
     * @param defaultPrefix - The default command prefix.
     * @returns - A boolean indicating whether the prefix needs updating.
     */
    private executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): void | boolean {
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number as SecurityClearance;
        const helpCommands = ["help", "--help", "-h"];

        if (helpCommands.includes(commandName) || helpCommands.includes(args[0]?.toLowerCase())) {
            if (playerSecurityClearance && playerSecurityClearance >= SecurityClearance.Level1) {
                if (args.length === 0 || helpCommands.includes(commandName)) {
                    this.displayAllCommands(player);
                    return false;
                } else {
                    const specifiedCommandName = helpCommands.includes(commandName) ? args[0] : commandName;
                    const commandInfo = this.getCommandInfo(specifiedCommandName, player);
                    player.sendMessage(commandInfo.join("\n") || "\n§2[§7Paradox§2]§o§7 Command not found.");
                    return false;
                }
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 You do not have sufficient clearance to use the help command.");
                return false;
            }
        }

        const command = this.commands.get(commandName);
        if (command) {
            if ((playerSecurityClearance && playerSecurityClearance >= command.securityClearance) || commandName === "op") {
                try {
                    const validateReturn = command.execute(message, args, CryptoES);
                    if (commandName === "prefix" && validateReturn) {
                        return true;
                    }
                } catch (error) {
                    console.error("Error occurred during command execution:", error);
                }
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 You do not have sufficient clearance to execute this command.");
            }
        } else {
            player.sendMessage(`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found. Use ${defaultPrefix}help to see available commands.`);
        }
    }

    /**
     * Retrieves information about a specific command with enhanced formatting.
     * @param commandName - The name of the command.
     * @returns - An array of strings containing the command information.
     */
    private getCommandInfo(commandName: string, player: Player): string[] {
        const command = this.commands.get(commandName);
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;
        if (command) {
            let info = [
                `\n§2[§7Command§2]§f: §o${command.name}§r`,
                `§2[§7Usage§2]§f: §o${this.formatUsage(command.usage)}§r`,
                `§2[§7Description§2]§f: §o${command.description}§r`,
                `§2[§7Examples§2]§f:\n${command.examples.map((example: string) => `    §o${example}`).join("\n")}`,
            ];

            // Include the special note if it exists
            if (command.specialNote && playerSecurityClearance === 4) {
                info.push(`§2[§7Note§2]§f: §o${command.specialNote}§r`);
            }

            return info;
        } else {
            return [`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found.`];
        }
    }

    /**
     * Formats the usage string by adding color to specific characters.
     * @param usage - The original usage string.
     * @returns - The formatted usage string.
     */
    private formatUsage(usage: string): string {
        const formattedUsage = usage.replace(/\[|\]|\<|\>|\|/g, (match) => {
            switch (match) {
                case "[":
                case "]":
                case "<":
                case ">":
                    return `§2${match}§f`;
                case "|":
                    return `§2|§f`;
                default:
                    return match;
            }
        });
        return formattedUsage;
    }

    /**
     * Displays all commands available to the player, sorted alphabetically.
     * @param player - The player requesting the list of commands.
     */
    private displayAllCommands(player: Player): void {
        let helpMessage = "\n§2[§7Available Commands§2]§r\n";
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;

        this.commandsByCategory.forEach((commands, category) => {
            const filteredCommands = commands.filter((command) => command.securityClearance <= playerSecurityClearance);
            if (filteredCommands.length > 0) {
                helpMessage += `\n§2[§7${category}§2]§r\n`;
                filteredCommands
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach((command) => {
                        helpMessage += this.getCommandDescription(command);
                    });
            }
        });

        player.sendMessage(helpMessage || "\n§2[§7Paradox§2]§o§7 No commands registered.");
    }

    /**
     * Returns the description of a command.
     * @param command - The command to describe.
     * @returns - A string describing the command.
     */
    private getCommandDescription(command: Command): string {
        return `§7${command.name}§2: §o§f${command.description}§r\n`;
    }

    /**
     * Checks if a command can be executed based on rate limiting.
     * @returns - A boolean indicating whether a command can be executed.
     */
    private canExecuteCommand(): boolean {
        const currentTick = system.currentTick;

        if (currentTick - this.lastCommandTimestamp >= this.rateLimitInterval) {
            this.commandCount = 0;
            this.lastCommandTimestamp = currentTick;
        }

        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
