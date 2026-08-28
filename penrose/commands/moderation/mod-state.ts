import { ChatSendBeforeEvent, system, world, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { moduleActions, moduleStopActions, paradoxModulesDB } from "../../event-listeners/world-initialize";

type ModuleKey = keyof typeof moduleActions;
type ModuleStartAction = (settings?: unknown) => Promise<boolean | void> | boolean | void;

/**
 * Validates whether the given subcommand is valid.
 * @param {string} [subCommand] - User-supplied subcommand argument.
 * @returns {boolean} True if subCommand is "enable" or "disable".
 */
function isValidSubCommand(subCommand?: string): boolean {
    return subCommand === "enable" || subCommand === "disable";
}

/**
 * Sends command usage instruction message to the player.
 * @param {Player} player - Invoking player entity.
 */
function sendUsageMessage(player: Player): void {
    const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
    player.sendMessage(`§2[§7Paradox§2]§o§c Usage: ${prefix}modstate [ enable | disable ]`);
}

/**
 * Disables a single target module if currently enabled.
 * @param {ModuleKey} moduleKey - Unique identifier key of target module.
 * @returns {Promise<boolean>} True if module state was modified to disabled.
 */
async function disableModule(moduleKey: ModuleKey): Promise<boolean> {
    const dbKey = moduleKey as Parameters<typeof paradoxModulesDB.get>[0];
    const moduleData = (await paradoxModulesDB.get(dbKey)) ?? { enabled: false };

    if (!moduleData.enabled) return false;

    await paradoxModulesDB.set(dbKey, {
        ...moduleData,
        enabled: false,
    });

    system.run(() => {
        const stopAction = moduleStopActions[moduleKey];
        if (stopAction) stopAction();
    });

    return true;
}

/**
 * Enables a single target module if currently disabled and startup succeeds.
 * @param {ModuleKey} moduleKey - Unique identifier key of target module.
 * @param {ModuleStartAction} startAction - Module activation execution callback.
 * @returns {Promise<boolean>} True if module state was modified to enabled.
 */
async function enableModule(moduleKey: ModuleKey, startAction: ModuleStartAction): Promise<boolean> {
    const dbKey = moduleKey as Parameters<typeof paradoxModulesDB.get>[0];
    const moduleData = (await paradoxModulesDB.get(dbKey)) ?? { enabled: false };

    if (moduleData.enabled) return false;

    let result: boolean | void = true;
    try {
        result = await startAction(moduleData.settings);
    } catch {
        result = false;
    }

    if (result === false) {
        await paradoxModulesDB.set(dbKey, {
            ...moduleData,
            enabled: false,
        });
        return false;
    }

    await paradoxModulesDB.set(dbKey, {
        ...moduleData,
        enabled: true,
    });

    return true;
}

/**
 * Iterates across registered modules and updates state concurrently.
 * @param {boolean} isDisable - Flag indicating bulk disable request.
 * @returns {Promise<number>} Total count of modified module states.
 */
async function processModuleStateChanges(isDisable: boolean): Promise<number> {
    let modifiedCount = 0;

    for (const [moduleKey, startAction] of Object.entries(moduleActions) as [ModuleKey, ModuleStartAction][]) {
        const wasModified = isDisable
            ? await disableModule(moduleKey)
            : await enableModule(moduleKey, startAction);

        if (wasModified) modifiedCount++;
    }

    return modifiedCount;
}

/**
 * Sends summary feedback message to player reporting changed module totals.
 * @param {Player} player - Invoking player entity.
 * @param {boolean} isDisable - Flag indicating bulk disable request.
 * @param {number} modifiedCount - Total number of updated module states.
 */
function sendFeedbackMessage(player: Player, isDisable: boolean, modifiedCount: number): void {
    if (isDisable) {
        if (modifiedCount === 0) {
            player.sendMessage("§2[§7Paradox§2]§o§7 All modules are already §4disabled§7.");
        } else {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Successfully disabled §4${modifiedCount}§7 module(s).`);
        }
    } else {
        if (modifiedCount === 0) {
            player.sendMessage("§2[§7Paradox§2]§o§7 All compatible modules are already §aenabled§7.");
        } else {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Successfully enabled §a${modifiedCount}§7 module(s).`);
        }
    }
}

/**
 * Represents the command to bulk-enable or bulk-disable modules globally.
 */
export const modStateCommand: Command = {
    name: "modstate",
    description: "Enables or disables all Paradox protection and utility modules at once.",
    usage: "{prefix}modstate [ enable | disable ]",
    examples: ["{prefix}modstate", "{prefix}modstate enable", "{prefix}modstate disable"],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/check.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Bulk Module State Control",
        description:
            "Enable or disable all Paradox protection checks and utility modules concurrently.\n\n" +
            "§7• §fEnable All§7: Starts all registered modules and marks them enabled in the database.\n" +
            "§7• §fDisable All§7: Stops all running module listeners and updates database records.\n\n" +
            "§7Rules & Behavior:\n" +
            "§7• Requires security clearance level 4.\n" +
            "§7• Preserves custom settings and timers when enabling.\n" +
            "§7• Modules already in the target state are skipped automatically.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable All Modules",
                command: ["enable"],
                icon: "textures/ui/check.png",
                description: "Activates and starts all Paradox protection modules instantly.",
            },
            {
                name: "Disable All Modules",
                command: ["disable"],
                icon: "textures/ui/cancel.png",
                description: "Stops and deactivates all running Paradox protection modules.",
            },
        ],
    },

    /**
     * Executes the modstate command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} [args] - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const subCommand = args[0]?.toLowerCase().trim();

        if (!isValidSubCommand(subCommand)) {
            sendUsageMessage(player);
            return;
        }

        const isDisable = subCommand === "disable";
        const modifiedCount = await processModuleStateChanges(isDisable);
        sendFeedbackMessage(player, isDisable, modifiedCount);
    },
};
