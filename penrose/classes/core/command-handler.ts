import { Player, ChatSendBeforeEvent, system, world, PlayerSpawnAfterEvent } from "@minecraft/server";
import * as CryptoES from "../../node_modules/crypto-es";

/**
 * Security clearance levels for commands.
 * Determines which players can execute certain commands.
 */
export enum SecurityClearance {
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
    command?: string[] | undefined;

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

    /** Automatically populate dropdown with players, entities, chests, waypoints, homes, or custom handler logic */
    sourceType?: "players" | "entities" | "chests" | "playerWaypoints" | "playerHomes" | "custom";

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

    /** Optional sub-argument security level requirements */
    argSecurity?: Record<string, SecurityClearance>;

    /** Optional GUI icon texture path */
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

    /** Currently active commands lookup by lowercased name */
    private commands: Map<string, Command> = new Map();

    /** Master list of all registered commands (including disabled ones) */
    private masterCommands: Map<string, Command> = new Map();

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
     * Initializes a new CommandHandler and retrieves the current prefix and GUI item settings.
     */
    constructor() {
        this.prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        this.guiItem = world.getDynamicProperty("__guiItem") as string | undefined;
    }

    /**
     * Registers active commands and maintains a master list of all available commands.
     * @param {Command[]} activeCommands - Currently active Command objects
     * @param {Command[]} [allCommands] - Optional full array of all registered commands
     */
    public registerCommand(activeCommands: Command[], allCommands?: Command[]): void {
        this.commands.clear();
        this.commandsByCategory.clear();

        if (allCommands) {
            this.masterCommands.clear();
            allCommands.forEach((cmd) => {
                this.masterCommands.set(cmd.name.toLowerCase(), cmd);
            });
        }

        activeCommands.forEach((command) => {
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
     * Returns all currently active registered commands.
     * @returns {Command[]} Array of active commands
     */
    public getRegisteredCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Handles a player sending a command message.
     * Clearance Level 4 bypasses rate limits.
     * @param {ChatSendBeforeEvent} message - Chat send before event
     * @param {Player} player - Player sending the command
     * @param {string} prefix - Current prefix used
     * @returns {Promise<boolean>} True if processed as a command, false otherwise
     */
    public async handleCommand(message: ChatSendBeforeEvent, player: Player, prefix: string): Promise<boolean> {
        const args = message.message.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return false;

        const playerClearance = this.getPlayerClearance(player);
        if (playerClearance < SecurityClearance.Level4 && !this.canExecuteCommand()) {
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
     * Returns the item ID configured to open the GUI form.
     * @returns {string | undefined} Minecraft item ID or undefined
     */
    public getGuiItem(): string | undefined {
        return this.guiItem;
    }

    /**
     * Sets the item ID configured to open the GUI form.
     * @param {string | undefined} itemId - Minecraft item ID string or undefined
     */
    public setGuiItem(itemId: string | undefined): void {
        this.guiItem = itemId;
        world.setDynamicProperty("__guiItem", itemId);
    }

    /**
     * Updates prefix variables across commands dynamically.
     * @param {Player} player - Player updating the prefix
     */
    public updatePrefix(player: Player): void {
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
     * Filters buttons by security clearance for dynamic ActionFormData generation.
     * @param {ActionFormButton[]} buttons - Array of ActionFormButtons
     * @param {number} playerSecurityClearance - Clearance level of requesting player
     * @returns {ActionFormButton[]} Filtered ActionFormButton array
     */
    public filterButtonsBySecurity(buttons: ActionFormButton[], playerSecurityClearance: number): ActionFormButton[] {
        return buttons
            .filter((button) => (button.securityClearance ?? SecurityClearance.Level1) <= playerSecurityClearance)
            .map((button) => ({
                ...button,
                ...(button.subActions ? { subActions: this.filterButtonsBySecurity(button.subActions, playerSecurityClearance) } : {}),
            }));
    }

    /**
     * Gets the player's security clearance dynamic property value.
     * @param {Player} player - Player entity
     * @returns {number} Dynamic property integer value or default level 1
     */
    private getPlayerClearance(player: Player): number {
        return (player.getDynamicProperty("securityClearance") as number) ?? SecurityClearance.Level1;
    }

    /**
     * Resolves and retrieves the command object based on state and user clearance.
     * @param {string} commandName - Target command name
     * @param {number} playerClearance - Executive player's clearance level
     * @returns {Command | null | undefined} Command object, null if explicitly disabled, or undefined if missing.
     */
    private resolveCommand(commandName: string, playerClearance: number): Command | null | undefined {
        const activeCommand = this.commands.get(commandName);
        if (activeCommand) return activeCommand;

        const disabledCommand = this.masterCommands.get(commandName);
        if (disabledCommand) {
            return playerClearance === SecurityClearance.Level4 ? disabledCommand : null;
        }

        return undefined;
    }

    /**
     * Checks if the user clearance meets command or sub-argument security requirements.
     * @param {Command} command - Target command object
     * @param {string | undefined} argKey - First argument key parameter
     * @param {number} playerClearance - Clearance level of calling player
     * @returns {boolean} True if execution is permitted
     */
    private checkCommandPermission(command: Command, argKey: string | undefined, playerClearance: number): boolean {
        const requiredClearance = command.argSecurity?.[argKey ?? ""] ?? command.securityClearance ?? SecurityClearance.Level1;
        return (playerClearance >= requiredClearance && playerClearance <= SecurityClearance.Level4) || command.name.toLowerCase() === "op";
    }

    /**
     * Handles processing and execution of help-related requests.
     * @param {Player} player - Recipient player
     * @param {string} commandName - Target command key
     * @param {string[]} args - Parameter list array
     * @param {string[]} helpAliases - Recognized help syntax terms
     */
    private handleHelpRequest(player: Player, commandName: string, args: string[], helpAliases: string[]): void {
        const targetCommand = helpAliases.includes(commandName) ? args[0]?.toLowerCase() : commandName;
        if (!targetCommand) {
            this.displayAllCommands(player);
        } else {
            const info = this.getCommandInfo(targetCommand, player);
            player.sendMessage(info.join("\n") || "\n§2[§7Paradox§2]§o§7 Command not found.");
        }
    }

    /**
     * Safely executes target command and handles uncaught exceptions.
     * @param {Command} command - Instantiated command structure
     * @param {ChatSendBeforeEvent} message - Message context payload
     * @param {Player} player - Invoking player entity
     * @param {string[]} args - Parsed argument strings
     * @returns {Promise<boolean>} True if internal prefix state update is required
     */
    private async dispatchCommandExecution(command: Command, message: ChatSendBeforeEvent, player: Player, args: string[]): Promise<boolean> {
        try {
            const execResult = await command.execute(message, args, CryptoES);
            return command.name.toLowerCase() === "prefix" && typeof execResult === "boolean" ? execResult : false;
        } catch (err) {
            console.error("[Paradox] Command execution error:", err);
            player.sendMessage("§2[§7Paradox§2]§o§7 Error executing the command.");
            return false;
        }
    }

    /**
     * Executes a command safely, checks security clearance, and handles help queries.
     * @param {ChatSendBeforeEvent} message - Chat event message
     * @param {Player} player - Player executing command
     * @param {string} commandName - Name of the target command
     * @param {string[]} args - Arguments provided
     * @param {string} defaultPrefix - Active prefix
     * @returns {Promise<boolean>} Boolean indicating success or system state change
     */
    private async executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): Promise<boolean> {
        const helpAliases = ["help", "--help"];
        const isHelpRequest = helpAliases.includes(commandName) || helpAliases.includes(args[0]?.toLowerCase() ?? "");
        const playerClearance = this.getPlayerClearance(player);

        const command = this.resolveCommand(commandName, playerClearance);

        if (command === null) {
            player.sendMessage(`\n§2[§7Paradox§2]§o§7 The command "${commandName}" is currently disabled.`);
            return false;
        }

        if (!command && !isHelpRequest) {
            player.sendMessage(`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found. Use ${defaultPrefix}help.`);
            return false;
        }

        if (command && !this.checkCommandPermission(command, args[0]?.toLowerCase(), playerClearance)) {
            player.sendMessage("§2[§7Paradox§2]§o§7 Insufficient clearance to execute this command.");
            return false;
        }

        if (isHelpRequest) {
            this.handleHelpRequest(player, commandName, args, helpAliases);
            return false;
        }

        return await this.dispatchCommandExecution(command!, message, player, args);
    }

    /**
     * Formats information block for a specific command.
     * @param {string} commandName - Target command name
     * @param {Player} player - Player asking for command information
     * @returns {string[]} Line array containing formatted details
     */
    private getCommandInfo(commandName: string, player: Player): string[] {
        const command = this.commands.get(commandName) ?? this.masterCommands.get(commandName);
        if (!command) return [`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found.`];

        const playerClearance = this.getPlayerClearance(player);
        const info = [
            `\n§2[§7Command§2]§f: §o${command.name}§r`,
            `§2[§7Usage§2]§f: §o${this.formatUsage(command.usage)}§r`,
            `§2[§7Description§2]§f: §o${command.description}§r`,
            `§2[§7Examples§2]§f:\n${command.examples.map((ex) => `    §o${ex}`).join("\n")}`,
        ];

        if (command.specialNote && playerClearance === SecurityClearance.Level4) {
            info.push(`§2[§7Note§2]§f: §o${command.specialNote}§r`);
        }

        return info;
    }

    /**
     * Formats usage bracket syntax with Minecraft color codes.
     * @param {string} usage - Raw command usage string
     * @returns {string} Colorized string
     */
    private formatUsage(usage: string): string {
        return usage.replace(/[\[\]<>\|]/g, (m) => `§2${m}§f`);
    }

    /**
     * Displays all registered commands divided by categories to the player.
     * @param {Player} player - Player viewing commands
     */
    private displayAllCommands(player: Player): void {
        let message = "\n§2[§7Available Commands§2]§r\n";
        const playerClearance = this.getPlayerClearance(player);

        this.commandsByCategory.forEach((commands, category) => {
            const filtered = commands.filter((c) => c.securityClearance <= playerClearance);
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
     * Acquires lock for processing command executions sequentially.
     */
    private async acquireCommandExecutionLock(): Promise<void> {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => system.run(resolve));
        }
        this.prefixLock = true;
    }

    /**
     * Releases lock after command execution completes.
     */
    private releaseCommandExecutionLock(): void {
        this.prefixLock = false;
    }

    /**
     * Determines whether command rate limit bucket allows execution.
     * @returns {boolean} True if allowed, false if limit exceeded
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
