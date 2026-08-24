import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startDimensionLock, stopDimensionLock } from "../../modules/dimension-lock";

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

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        const moduleKey = "dimensionLock_b";
        const moduleData = (await paradoxModulesDB.get(moduleKey)) ?? {
            enabled: false,
            settings: { nether: false, theEnd: false },
        };

        if (!moduleData.settings) {
            moduleData.settings = { nether: false, theEnd: false };
        }

        const arg0 = args[0]?.toLowerCase();

        // Handle status listing
        if (args.includes("-l") || args.includes("--list")) {
            message.sender.sendMessage(
                [
                    `§2[§7Paradox§2]§o§7 Dimension Lock Status:`,
                    `  | §7Module: ${moduleData.enabled ? "§aENABLED§7" : "§4DISABLED§7"}`,
                    `  | §7Nether: ${moduleData.settings.nether ? "§4LOCKED§7" : "§aUNLOCKED§7"}`,
                    `  | §7The End: ${moduleData.settings.theEnd ? "§4LOCKED§7" : "§aUNLOCKED§7"}`,
                ].join("\n")
            );
            return;
        }

        // Handle global enable/disable toggle
        if (!arg0 || arg0 === "on" || arg0 === "off" || arg0 === "--enable" || arg0 === "--disable") {
            const isEnabled = arg0 === "on" || arg0 === "--enable" ? true : arg0 === "off" || arg0 === "--disable" ? false : !moduleData.enabled;
            moduleData.enabled = isEnabled;
            await paradoxModulesDB.set(moduleKey, moduleData);

            if (isEnabled) startDimensionLock();
            else stopDimensionLock();

            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Dimension locking is now ${isEnabled ? "§aENABLED" : "§cDISABLED"}§7.`);
            return;
        }

        // Handle dimension specific lock logic
        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: !dimensionlock <nether | end> <on | off>");
            return;
        }

        const dimension = arg0;
        const state = args[1].toLowerCase();

        if (dimension !== "nether" && dimension !== "end") {
            message.sender.sendMessage("§o§c[Paradox] Invalid dimension or state. Use 'nether', 'end', 'on', or 'off'.");
            return;
        }

        if (state !== "on" && state !== "off") {
            message.sender.sendMessage("§o§c[Paradox] Invalid state. Use 'on' or 'off'.");
            return;
        }

        const isLocked = state === "on";
        const settingsKey = dimension === "nether" ? "nether" : "theEnd";

        moduleData.settings[settingsKey] = isLocked;

        // Automatically enable the module if a dimension is being locked
        if (isLocked) moduleData.enabled = true;

        await paradoxModulesDB.set(moduleKey, moduleData);

        if (moduleData.enabled) startDimensionLock();
        else stopDimensionLock();

        const dimDisplay = dimension === "nether" ? "Nether" : "The End";
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${dimDisplay} is now ${isLocked ? "§4LOCKED" : "§aUNLOCKED"}§7.`);
    },
};
