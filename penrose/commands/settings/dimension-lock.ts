import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startDimensionLock, stopDimensionLock } from "../../modules/dimension-lock-module";

interface DimensionLockSettings {
    nether: boolean;
    theEnd: boolean;
}

interface DimensionLockModuleData {
    enabled: boolean;
    settings: DimensionLockSettings;
}

const MODULE_KEY = "dimensionLock_b";

/**
 * Retrieves module data structure from database with defaults.
 * @returns {Promise<DimensionLockModuleData>} Stored or default module state.
 */
async function getModuleData(): Promise<DimensionLockModuleData> {
    const data = (await paradoxModulesDB.get(MODULE_KEY)) as DimensionLockModuleData | undefined;
    return {
        enabled: data?.enabled ?? false,
        settings: {
            nether: data?.settings?.nether ?? false,
            theEnd: data?.settings?.theEnd ?? false,
        },
    };
}

/**
 * Displays current dimension lock module configuration status to sender.
 * @param {Player} sender - Target message recipient player.
 * @param {DimensionLockModuleData} moduleData - Current state settings.
 */
function displayStatus(sender: Player, moduleData: DimensionLockModuleData): void {
    sender.sendMessage(
        [
            `§2[§7Paradox§2]§o§7 Dimension Lock Status:`,
            `  | §7Module: ${moduleData.enabled ? "§aENABLED§7" : "§4DISABLED§7"}`,
            `  | §7Nether: ${moduleData.settings.nether ? "§4LOCKED§7" : "§aUNLOCKED§7"}`,
            `  | §7The End: ${moduleData.settings.theEnd ? "§4LOCKED§7" : "§aUNLOCKED§7"}`,
        ].join("\n")
    );
}

/**
 * Syncs module runtime state and persists database choices.
 * @param {DimensionLockModuleData} moduleData - Updated state structure to set.
 */
async function syncModuleState(moduleData: DimensionLockModuleData): Promise<void> {
    await paradoxModulesDB.set(MODULE_KEY, moduleData);
    if (moduleData.enabled) {
        startDimensionLock();
    } else {
        stopDimensionLock();
    }
}

/**
 * Handles global toggle state change.
 * @param {Player} sender - Executing player.
 * @param {DimensionLockModuleData} moduleData - Active module state data.
 * @param {string | undefined} arg0 - Primary argument string.
 */
async function handleGlobalToggle(sender: Player, moduleData: DimensionLockModuleData, arg0?: string): Promise<void> {
    const isEnabled = arg0 === "on" || arg0 === "--enable" ? true : arg0 === "off" || arg0 === "--disable" ? false : !moduleData.enabled;
    moduleData.enabled = isEnabled;

    await syncModuleState(moduleData);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 Dimension locking is now ${isEnabled ? "§aENABLED" : "§cDISABLED"}§7.`);
}

/**
 * Handles toggling access locks for specific dimensions.
 * @param {Player} sender - Executing player.
 * @param {DimensionLockModuleData} moduleData - Active module state data.
 * @param {string} dimension - Dimension targeted ('nether' | 'end').
 * @param {string | undefined} state - Target toggle flag string ('on' | 'off').
 */
async function handleDimensionToggle(sender: Player, moduleData: DimensionLockModuleData, dimension: string, state?: string): Promise<void> {
    if (dimension !== "nether" && dimension !== "end") {
        sender.sendMessage("§o§c[Paradox] Invalid dimension or state. Use 'nether', 'end', 'on', or 'off'.");
        return;
    }

    if (state !== "on" && state !== "off") {
        sender.sendMessage("§o§c[Paradox] Invalid state. Use 'on' or 'off'.");
        return;
    }

    const isLocked = state === "on";
    const settingsKey = dimension === "nether" ? "nether" : "theEnd";

    moduleData.settings[settingsKey] = isLocked;
    if (isLocked) {
        moduleData.enabled = true;
    }

    await syncModuleState(moduleData);

    const dimDisplay = dimension === "nether" ? "Nether" : "The End";
    sender.sendMessage(`§2[§7Paradox§2]§o§7 ${dimDisplay} is now ${isLocked ? "§4LOCKED" : "§aUNLOCKED"}§7.`);
}

/**
 * Command to lock or unlock access to the Nether and The End dimensions.
 */
export const dimensionLockCommand: Command = {
    name: "dimensionlock",
    description: "Administratively restricts access to world dimensions.",
    usage: "{prefix}dimensionlock < nether | end | on | off | --list > [ on | off ]",
    examples: ["{prefix}dimensionlock nether on", "{prefix}dimensionlock end off", "{prefix}dimensionlock on", "{prefix}dimensionlock off", "{prefix}dimensionlock --list"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/map_empty.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Dimension Lock Control",
        description:
            "Administratively restrict access to world dimensions.\n\n" +
            "§7• §fLock Nether§7: Prevents players from entering the Nether.\n" +
            "§7• §fLock The End§7: Prevents players from entering The End.\n\n" +
            "§7Navigation:\n" +
            "§7• Use §fEnable§7 to choose a dimension to lock and activate enforcement.\n" +
            "§7• Use §fDisable§7 to globally turn off dimension locking.\n\n" +
            "§7Rules:\n" +
            "§7• Affected players are teleported back to their previous dimension's spawn.\n" +
            "§7• Level 4 administrators are always exempt.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable Dimension Locking",
                description: "Select a dimension to lock and activate the system.\n\n",
                generateSubActions: true,
                icon: "textures/ui/realms_green_check.png",
                subActions: [
                    {
                        name: "Lock Nether",
                        command: ["nether", "on"],
                        description: "Enables system and locks the Nether.",
                        icon: "textures/ui/NetherPortal.png",
                    },
                    {
                        name: "Lock The End",
                        command: ["end", "on"],
                        description: "Enables system and locks The End.",
                        icon: "textures/blocks/end_portal.png",
                    },
                ],
            },
            { name: "Disable Dimension Locking", command: ["off"], description: "Globally turn off all dimension locking.", icon: "textures/ui/realms_red_x.png" },
            {
                name: "Lock/Unlock Nether",
                command: ["nether"],
                description: "Toggle access to the Nether.",
                requiredFields: ["state"],
                generateModalForm: true,
                icon: "textures/ui/NetherPortal.png",
            },
            {
                name: "Lock/Unlock The End",
                command: ["end"],
                description: "Toggle access to The End.",
                requiredFields: ["state"],
                generateModalForm: true,
                icon: "textures/blocks/end_portal.png",
            },
            {
                name: "List Status",
                command: ["--list"],
                description: "View the current dimension lock configuration.",
                icon: "textures/ui/icon_sign.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect State:",
                type: "dropdown",
                options: ["on", "off"],
                requiredFields: ["state"],
            },
        ],
    },

    /**
     * Executes the dimensionlock command.
     * @param {ChatSendBeforeEvent} [message] - Chat send event object.
     * @param {string[]} [args] - Provided command argument strings.
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;

        const sender = message.sender;
        const moduleData = await getModuleData();
        const arg0 = args[0]?.toLowerCase();

        if (args.includes("-l") || args.includes("--list")) {
            displayStatus(sender, moduleData);
            return;
        }

        if (!arg0 || arg0 === "on" || arg0 === "off" || arg0 === "--enable" || arg0 === "--disable") {
            await handleGlobalToggle(sender, moduleData, arg0);
            return;
        }

        if (args.length < 2) {
            sender.sendMessage("§o§c[Paradox] Usage: !dimensionlock <nether | end> <on | off>");
            return;
        }

        await handleDimensionToggle(sender, moduleData, arg0, args[1]?.toLowerCase());
    },
};
