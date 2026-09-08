import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command, CommandHandler, SecurityClearance } from "../../classes/core/command-handler";

/** Map O(1) lookup table to parse clearance values directly from string or dropdown index */
const CLEARANCE_MAP: Record<string, SecurityClearance> = {
    "1": SecurityClearance.Level1,
    "2": SecurityClearance.Level2,
    "3": SecurityClearance.Level3,
    "4": SecurityClearance.Level4,
    "0": SecurityClearance.Level1,
    "1 (level 1)": SecurityClearance.Level1,
    "2 (level 2)": SecurityClearance.Level2,
    "3 (level 3)": SecurityClearance.Level3,
    "4 (level 4)": SecurityClearance.Level4,
};

/**
 * Normalizes arguments passed from chat or GUI into a standard key-value string tuple in O(1) time.
 *
 * @param args - Raw arguments array passed to command execution.
 * @returns Parsed target path and level string tuple, or null if insufficient args.
 */
function normalizeArguments(args: string[]): { targetPath: string; levelStr: string } | null {
    if (args.length >= 2) {
        return { targetPath: args[0]!, levelStr: args[1]! };
    }

    if (args.length === 1 && args[0]) {
        const splitArgs = args[0].trim().split(/\s+/);
        if (splitArgs.length >= 2) {
            return { targetPath: splitArgs[0]!, levelStr: splitArgs[1]! };
        }
    }

    return null;
}

/**
 * Validates and converts an argument string or dropdown option into a SecurityClearance enum value in O(1) time.
 *
 * @param levelStr - Raw input string or dropdown index representing clearance level.
 * @returns Valid clearance level or null if invalid.
 */
function parseClearanceLevel(levelStr?: string): SecurityClearance | null {
    if (!levelStr) return null;
    const cleanKey = levelStr.trim().toLowerCase().split(" ")[0] ?? "";
    return CLEARANCE_MAP[cleanKey] ?? null;
}

/**
 * Updates dynamic properties and in-memory clearance maps for sub-arguments in O(1) time.
 *
 * @param command - Target command object reference.
 * @param commandName - Name of target base command.
 * @param subArg - Sub-argument target path string.
 * @param clearanceLevel - Target SecurityClearance enum level.
 */
function updateSubArgSecurity(command: Command, commandName: string, subArg: string, clearanceLevel: SecurityClearance): void {
    command.argSecurity ??= {};
    command.argSecurity[subArg] = clearanceLevel;
    world.setDynamicProperty(`cmd_argsec_${commandName}`, JSON.stringify(command.argSecurity));
}

/**
 * Updates dynamic properties and base command clearance in O(1) time.
 *
 * @param command - Target command object reference.
 * @param commandName - Name of target base command.
 * @param clearanceLevel - Target SecurityClearance enum level.
 */
function updateBaseCommandSecurity(command: Command, commandName: string, clearanceLevel: SecurityClearance): void {
    command.securityClearance = clearanceLevel;
    world.setDynamicProperty(`cmd_clearance_${commandName}`, clearanceLevel);
}

/**
 * Command allowing Level 4 admins to dynamically alter security clearance requirements
 * for base commands as well as specific sub-arguments.
 */
export const setClearanceCommand: Command = {
    name: "setclearance",
    description: "Modifies required security clearance for a command or specific sub-argument.",
    usage: "{prefix}setclearance <commandName[.subArg]> <level 1-4>",
    examples: ["{prefix}setclearance fly 3", "{prefix}setclearance landclaim.delete 2", "{prefix}setclearance ban 4"],
    category: "Moderation",
    securityClearance: SecurityClearance.Level4,
    icon: "textures/ui/gear.png",

    guiInstructions: {
        formType: "ModalFormData",
        title: "Set Clearance Level",
        description: "Change clearance for a command or sub-argument (e.g., 'landclaim.delete' or 'landclaim').",
        dynamicFields: [
            {
                name: "Command or Sub-Arg (cmd or cmd.arg)",
                placeholder: "e.g., landclaim.delete",
                type: "text",
                validationRegex: /^[a-zA-Z0-9_.-]+$/,
                errorMessage: "Please enter a valid command target.",
            },
            {
                name: "Clearance Level",
                type: "dropdown",
                options: ["1", "2", "3", "4"],
            },
        ],
    },

    /**
     * Executes the setclearance command logic handling base command and argSecurity edge cases.
     *
     * @param message - Chat event payload.
     * @param args - Command arguments: [targetPath, clearanceLevel] or ["targetPath clearanceLevel"].
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []): void => {
        if (!message) return;
        const player: Player = message.sender;

        const parsedArgs = normalizeArguments(args);
        if (!parsedArgs) {
            player.sendMessage("§2[§7Paradox§2]§o§7 Usage: setclearance <command[.subArg]> <level 1-4>");
            return;
        }

        const clearanceLevel = parseClearanceLevel(parsedArgs.levelStr);
        if (clearanceLevel === null) {
            player.sendMessage("§2[§7Paradox§2]§o§7 Invalid clearance level. Level must be between 1 and 4.");
            return;
        }

        const rawTarget = parsedArgs.targetPath.toLowerCase();
        const targetParts = rawTarget.split(".");
        const targetCommandName = targetParts[0]!;
        const subArg = targetParts.length > 1 ? targetParts[1] : undefined;

        const targetCommand = CommandHandler.getInstance()
            .getRegisteredCommands()
            .find((cmd) => cmd.name.toLowerCase() === targetCommandName);

        if (!targetCommand) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Command "${targetCommandName}" does not exist.`);
            return;
        }

        if (subArg) {
            updateSubArgSecurity(targetCommand, targetCommandName, subArg, clearanceLevel);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Clearance for "§a${targetCommand.name} ${subArg}§7" updated to Level §a${clearanceLevel}§7.`);
        } else {
            updateBaseCommandSecurity(targetCommand, targetCommandName, clearanceLevel);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance for command "§a${targetCommand.name}§7" updated to Level §a${clearanceLevel}§7.`);
        }
    },
};
