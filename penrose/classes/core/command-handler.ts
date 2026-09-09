// command-handler.ts
import { Player, ChatSendBeforeEvent, system, world, PlayerSpawnAfterEvent } from "@minecraft/server";
import * as CryptoES from "../../node_modules/crypto-es";
import { ActionFormButton, GUIInstructions } from "../../types/gui-schema";
import { GUIManager } from "../../commands/gui/form-generator";

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
    guiInstructions?: GUIInstructions;

    /**
     * Function executed when the command runs.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[], cryptoES?: typeof CryptoES, returnMonitorFunction?: boolean) => Promise<void | boolean> | void | ((object: PlayerSpawnAfterEvent) => void);
}

/**
 * Handles command registration, execution, and GUI integration.
 */
export class CommandHandler {
    /** Singleton instance holder */
    private static instance: CommandHandler | undefined;

    private commandsByCategory: Map<string, Command[]> = new Map();
    private commands: Map<string, Command> = new Map();
    private cachedActiveCommands: Command[] = [];
    private masterCommands: Map<string, Command> = new Map();

    private prefix: string;
    private guiItem: string | undefined;
    private prefixLock = false;
    private prefixUpdateLock = false;

    private readonly rateLimitInterval = 20;
    private readonly maxCommandsPerInterval = 5;
    private commandCount = 0;
    private lastCommandTimestamp = 0;

    /**
     * Private constructor enforces singleton pattern.
     */
    private constructor() {
        this.prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        this.guiItem = world.getDynamicProperty("__guiItem") as string | undefined;
    }

    /**
     * Retrieves or initializes the single shared CommandHandler instance.
     * @returns {CommandHandler} Singleton CommandHandler
     */
    public static getInstance(): CommandHandler {
        if (!CommandHandler.instance) {
            CommandHandler.instance = new CommandHandler();
        }
        return CommandHandler.instance;
    }

    /**
     * Registers active commands, applies dynamic clearance and argSecurity overrides, and invalidates GUI caches.
     * @param {Command[]} activeCommands - Array of active commands
     * @param {Command[]} [allCommands] - Optional full command set
     */
    public registerCommand(activeCommands: Command[], allCommands?: Command[]): void {
        this.commands.clear();
        this.commandsByCategory.clear();
        this.cachedActiveCommands = activeCommands;

        if (allCommands) {
            this.masterCommands.clear();
            for (let i = 0; i < allCommands.length; i++) {
                const cmd = allCommands[i]!;
                this.masterCommands.set(cmd.name.toLowerCase(), cmd);
            }
        }

        for (let i = 0; i < activeCommands.length; i++) {
            const command = activeCommands[i]!;
            const cmdNameLower = command.name.toLowerCase();

            // 1. Load persistent dynamic clearance overrides in O(1) time
            const savedClearance = world.getDynamicProperty(`cmd_clearance_${cmdNameLower}`) as number | undefined;
            if (savedClearance !== undefined) {
                command.securityClearance = savedClearance;
            }

            // 2. Load persistent sub-argument security (argSecurity) overrides
            const savedArgSec = world.getDynamicProperty(`cmd_argsec_${cmdNameLower}`) as string | undefined;
            if (savedArgSec) {
                try {
                    const parsedArgSec = JSON.parse(savedArgSec) as Record<string, SecurityClearance>;
                    command.argSecurity = command.argSecurity ? { ...command.argSecurity, ...parsedArgSec } : { ...parsedArgSec };
                } catch (err) {
                    console.error(`[Paradox] Failed to parse argSecurity for ${cmdNameLower}:`, err);
                }
            }

            const category = command.category.charAt(0).toUpperCase() + command.category.slice(1).toLowerCase();

            let catCommands = this.commandsByCategory.get(category);
            if (!catCommands) {
                catCommands = [];
                this.commandsByCategory.set(category, catCommands);
            }
            catCommands.push(command);

            this.commands.set(cmdNameLower, command);
        }

        // Synchronize GUI cache upon command state modification
        GUIManager.invalidateCommandCache();
    }

    public getRegisteredCommands(): Command[] {
        return this.cachedActiveCommands;
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
     * Returns the item ID configured to open the GUI form in O(1) time.
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
     * Updates prefix variables dynamically in O(1) memory overhead.
     * @param {Player} player - Player updating the prefix
     */
    public updatePrefix(player: Player): void {
        if (this.prefixUpdateLock) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Another prefix update is in progress.");
            return;
        }

        this.prefixUpdateLock = true;

        try {
            const newPrefix = (world.getDynamicProperty("__prefix") as string) ?? this.prefix;
            if (newPrefix !== this.prefix) {
                this.prefix = newPrefix;
            }
        } finally {
            this.prefixUpdateLock = false;
        }
    }

    /**
     * Filters buttons by security clearance for dynamic ActionFormData generation.
     * @param {ActionFormButton[]} buttons - Array of ActionFormButtons
     * @param {number} playerSecurityClearance - Clearance level of requesting player
     * @returns {ActionFormButton[]} Filtered ActionFormButton array
     */
    public filterButtonsBySecurity(buttons: ActionFormButton[], playerSecurityClearance: number): ActionFormButton[] {
        const result: ActionFormButton[] = [];
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i]!;
            if ((button.securityClearance ?? SecurityClearance.Level1) <= playerSecurityClearance) {
                result.push({
                    ...button,
                    ...(button.subActions ? { subActions: this.filterButtonsBySecurity(button.subActions, playerSecurityClearance) } : {}),
                });
            }
        }
        return result;
    }

    /**
     * Gets the player's security clearance dynamic property value in O(1) time.
     * @param {Player} player - Player entity
     * @returns {number} Dynamic property integer value or default level 1
     */
    private getPlayerClearance(player: Player): number {
        return (player.getDynamicProperty("securityClearance") as number) ?? SecurityClearance.Level1;
    }

    /**
     * Resolves and retrieves the command object based on state and user clearance in O(1) time.
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
     * Checks if the user clearance meets command or sub-argument security requirements in O(1) time.
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
        const formattedUsage = command.usage.replaceAll("{prefix}", this.prefix);
        const formattedExamples = command.examples.map((ex) => `    §o${ex.replaceAll("{prefix}", this.prefix)}`);

        const info = [`\n§2[§7Command§2]§f: §o${command.name}§r`, `§2[§7Usage§2]§f: §o${this.formatUsage(formattedUsage)}§r`, `§2[§7Description§2]§f: §o${command.description}§r`, `§2[§7Examples§2]§f:\n${formattedExamples.join("\n")}`];

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
     * Determines whether command rate limit bucket allows execution in O(1) time.
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
