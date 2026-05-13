import { Player, ChatSendBeforeEvent, system, world, PlayerSpawnAfterEvent } from "@minecraft/server";
import * as CryptoESImport from "../node_modules/crypto-es";

const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

/**
 * Security clearance levels for commands.
 * Determines which players can execute certain commands.
 */
enum SecurityClearance {
    Level1 = 1,
    Level2 = 2,
    Level3 = 3,
    Level4 = 4,
}

/**
 * Types of GUI forms supported by commands.
 */
type FormType = "ActionFormData" | "ModalFormData" | "MessageFormData";

/**
 * Represents a button in an action form GUI.
 */
export interface ActionFormButton {
    /** Display name of the button */
    name: string;

    /** Commands to execute when clicked */
    command?: string[];

    /** Optional description shown to the player */
    description?: string;

    /** Fields that must be filled before executing */
    requiredFields?: string[];

    /** Whether crypto handling is required */
    crypto?: boolean;

    /** If true, clicking generates a modal form */
    generateModalForm?: boolean;

    /** Optional Minecraft texture path for an icon */
    icon?: string;

    /** Whether sub-actions should appear when clicked */
    generateSubActions?: boolean;

    /** Optional array of sub-action buttons */
    subActions?: ActionFormButton[];

    /** Optional security clearance adjustment */
    securityClearance?: SecurityClearance;
}

/**
 * Represents a dynamic input field in a modal form GUI.
 */
export interface DynamicField {
    /** Field name or label */
    name: string;

    /** Argument key to pass back to the command */
    arg?: string;

    /** Type of input field */
    type: "text" | "dropdown" | "toggle";

    /** Placeholder text for text fields */
    placeholder?: string;

    /** Dropdown options */
    options?: string[];

    /** Automatically populate dropdown with players or entities or chests */
    sourceType?: "players" | "entities" | "chests";

    /** Required fields that must be filled before execution */
    requiredFields?: string[];

    /** Optional security clearance adjustment */
    securityClearance?: SecurityClearance;
}

/**
 * Instructions for generating a GUI for a command.
 */
export interface GuiInstructions {
    /** Type of form to generate */
    formType: FormType;

    /** Form title */
    title: string;

    /** Optional form description */
    description?: string;

    /** Command execution order */
    commandOrder?: "command-arg" | "arg-command" | undefined;

    /** Action buttons for ActionFormData */
    actions?: ActionFormButton[];

    /** Input fields for ModalFormData */
    dynamicFields?: DynamicField[];
}

/**
 * Represents a single server command.
 */
export interface Command {
    /** Command keyword */
    name: string;

    /** Description of command functionality */
    description: string;

    /** Optional special note for admins */
    specialNote?: string;

    /** Usage instructions string */
    usage: string;

    /** Array of example commands */
    examples: string[];

    /** Command category */
    category: string;

    /** Required security clearance to execute */
    securityClearance: SecurityClearance;

    argSecurity?: Record<string, SecurityClearance>;

    /** Optional GUI icon */
    icon?: string;

    /** Optional GUI instructions */
    guiInstructions?: GuiInstructions;

    /**
     * Function executed when the command runs.
     * @param message - Chat message event
     * @param args - Command arguments
     * @param cryptoES - Optional CryptoES reference
     * @param returnMonitorFunction - Optional flag
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[], cryptoES?: typeof CryptoES, returnMonitorFunction?: boolean) => Promise<void | boolean> | void | ((object: PlayerSpawnAfterEvent) => void);
}

/**
 * Handles command registration, execution, and GUI integration.
 */
export class CommandHandler {
    /** Commands organized by category */
    private commandsByCategory: Map<string, Command[]> = new Map();

    /** Commands lookup by name */
    private commands: Map<string, Command> = new Map();

    /** Current command prefix */
    private prefix: string;

    /** Item ID that opens the GUI when used */
    private guiItem: string | undefined;

    /** Lock to serialize command execution */
    private prefixLock = false;

    /** Lock for prefix updates */
    private prefixUpdateLock = false;

    /** Rate-limit interval in ticks */
    private readonly rateLimitInterval = 20;

    /** Maximum commands per interval */
    private readonly maxCommandsPerInterval = 5;

    /** Commands executed in current interval */
    private commandCount = 0;

    /** Tick of last executed command */
    private lastCommandTimestamp = 0;

    /**
     * Initializes a new CommandHandler and sets the prefix.
     */
    constructor() {
        this.prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        this.guiItem = world.getDynamicProperty("__guiItem") as string | undefined;
    }

    /**
     * Registers an array of commands and organizes them by category.
     * @param commands - Array of Command objects
     */
    registerCommand(commands: Command[]) {
        this.commands.clear();
        this.commandsByCategory.clear();

        commands.forEach((command) => {
            command.usage = command.usage.replaceAll("{prefix}", this.prefix);
            command.examples = command.examples.map((ex) => ex.replaceAll("{prefix}", this.prefix));

            const category = command.category.charAt(0).toUpperCase() + command.category.slice(1).toLowerCase();
            const catCommands = this.commandsByCategory.get(category) ?? [];
            catCommands.push(command);
            this.commandsByCategory.set(category, catCommands);

            this.commands.set(command.name.toLowerCase(), command);
        });
    }

    /**
     * Returns all registered commands.
     */
    getRegisteredCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Handles a player sending a command message.
     * @param message - Chat event
     * @param player - Player sending the command
     * @param prefix - Command prefix
     */
    async handleCommand(message: ChatSendBeforeEvent, player: Player, prefix: string): Promise<boolean> {
        const args = message.message.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return false;

        if (!this.canExecuteCommand()) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Commands are being rate-limited. Please wait.");
            return true;
        }

        await this.acquireCommandExecutionLock();
        try {
            const shouldUpdatePrefix = await this.executeCommand(message, player, commandName, args, prefix);
            if (shouldUpdatePrefix) this.updatePrefix(player);
        } finally {
            this.releaseCommandExecutionLock();
        }

        return true;
    }

    /**
     * Returns the current GUI trigger item ID.
     */
    getGuiItem(): string | undefined {
        return this.guiItem;
    }

    /**
     * Sets the GUI trigger item ID.
     * @param itemId - Minecraft item ID (e.g. 'minecraft:compass')
     */
    setGuiItem(itemId: string | undefined) {
        this.guiItem = itemId;
        world.setDynamicProperty("__guiItem", itemId);
    }

    /**
     * Updates the command prefix dynamically and updates all command usage strings and examples.
     * @param player - Player triggering prefix update
     */
    updatePrefix(player: Player) {
        if (this.prefixUpdateLock) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Another prefix update is in progress.");
            return;
        }

        this.prefixUpdateLock = true;

        (async () => {
            try {
                const newPrefix = (world.getDynamicProperty("__prefix") as string) ?? this.prefix;
                if (newPrefix !== this.prefix) {
                    for (const command of this.commands.values()) {
                        command.usage = command.usage.replaceAll(this.prefix + command.name, newPrefix + command.name);
                        command.examples = command.examples.map((ex) => ex.replaceAll(this.prefix + command.name, newPrefix + command.name));
                    }
                    this.prefix = newPrefix;
                }
            } finally {
                this.prefixUpdateLock = false;
            }
        })();
    }

    /**
     * Waits for locks to clear and acquires command execution lock.
     */
    private async acquireCommandExecutionLock() {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
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
     * Executes a command safely, checks security, and handles help requests.
     * @param message - Chat message event
     * @param player - Player executing the command
     * @param commandName - Command keyword
     * @param args - Command arguments
     * @param defaultPrefix - Current command prefix
     */
    private async executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): Promise<boolean> {
        const helpAliases = ["help", "--help", "-h"];
        const isHelpRequest = helpAliases.includes(commandName) || helpAliases.includes(args[0]?.toLowerCase());
        const command = this.commands.get(commandName);

        if (!command && !isHelpRequest) {
            player.sendMessage(`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found. Use ${defaultPrefix}help.`);
            return false;
        }

        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? SecurityClearance.Level1;

        /**
         * Determine security requirement.
         * Priority:
         * 1. arg-specific security
         * 2. command-level security
         */
        const argKey = args[0]?.toLowerCase();

        const requiredClearance = command?.argSecurity?.[argKey ?? ""] ?? command?.securityClearance ?? SecurityClearance.Level1;

        const hasPermission = (playerSecurityClearance >= requiredClearance && playerSecurityClearance <= SecurityClearance.Level4) || commandName === "op";

        if (!hasPermission) {
            player.sendMessage("§2[§7Paradox§2]§o§7 Insufficient clearance to execute this command.");
            return false;
        }

        if (isHelpRequest) {
            const targetCommand = helpAliases.includes(commandName) ? args[0]?.toLowerCase() : commandName;
            if (!targetCommand) {
                this.displayAllCommands(player);
            } else {
                const info = this.getCommandInfo(targetCommand, player);
                player.sendMessage(info.join("\n") || "\n§2[§7Paradox§2]§o§7 Command not found.");
            }
            return false;
        }

        try {
            const execResult = await command!.execute(message, args, CryptoES);
            return commandName === "prefix" && typeof execResult === "boolean" ? execResult : false;
        } catch (err) {
            console.error("[Paradox] Command execution error:", err);
            player.sendMessage("§2[§7Paradox§2]§o§7 Error executing the command.");
            return false;
        }
    }

    /**
     * Returns detailed command information for display.
     * @param commandName - Name of the command
     * @param player - Player requesting info
     */
    private getCommandInfo(commandName: string, player: Player): string[] {
        const command = this.commands.get(commandName);
        if (!command) return [`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found.`];

        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? SecurityClearance.Level1;
        const info = [
            `\n§2[§7Command§2]§f: §o${command.name}§r`,
            `§2[§7Usage§2]§f: §o${this.formatUsage(command.usage)}§r`,
            `§2[§7Description§2]§f: §o${command.description}§r`,
            `§2[§7Examples§2]§f:\n${command.examples.map((ex) => `    §o${ex}`).join("\n")}`,
        ];

        if (command.specialNote && playerSecurityClearance === SecurityClearance.Level4) {
            info.push(`§2[§7Note§2]§f: §o${command.specialNote}§r`);
        }

        return info;
    }

    /**
     * Formats usage string with Minecraft color codes.
     * @param usage - Command usage string
     */
    private formatUsage(usage: string): string {
        return usage.replace(/[\[\]<>\|]/g, (m) => `§2${m}§f`);
    }

    /**
     * Filters GUI buttons based on player security clearance.
     * Used when generating ActionFormData menus.
     */
    public filterButtonsBySecurity(buttons: ActionFormButton[], playerSecurityClearance: number): ActionFormButton[] {
        return buttons
            .filter((button) => (button.securityClearance ?? SecurityClearance.Level1) <= playerSecurityClearance)
            .map((button) => ({
                ...button,

                subActions: button.subActions ? this.filterButtonsBySecurity(button.subActions, playerSecurityClearance) : undefined,
            }));
    }

    /**
     * Displays all commands available to the player, sorted and filtered by security clearance.
     * @param player - Player requesting the command list
     */
    private displayAllCommands(player: Player) {
        let message = "\n§2[§7Available Commands§2]§r\n";
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? SecurityClearance.Level1;

        this.commandsByCategory.forEach((commands, category) => {
            const filtered = commands.filter((c) => c.securityClearance <= playerSecurityClearance);
            if (!filtered.length) return;

            message += `\n§2[§7${category}§2]§r\n`;
            filtered
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach((c) => {
                    message += `§7${c.name}§2: §o§f${c.description}§r\n`;
                });
        });

        player.sendMessage(message || "\n§2[§7Paradox§2]§o§7 No commands registered.");
    }

    /**
     * Checks if a command can be executed based on rate-limiting.
     */
    private canExecuteCommand(): boolean {
        const tick = system.currentTick;
        if (tick - this.lastCommandTimestamp >= this.rateLimitInterval) {
            this.commandCount = 0;
            this.lastCommandTimestamp = tick;
        }
        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
