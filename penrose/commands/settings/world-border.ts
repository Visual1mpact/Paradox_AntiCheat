import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startWorldBorderCheck, stopWorldBorderCheck } from "../../modules/world-border";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the worldborder command.
 */
export const worldBorderCommand: Command = {
    name: "worldborder",
    description: "Sets the world border and restricts players to that border.",
    usage: `{prefix}worldborder [ --overworld | -o <size> ] [ --nether | -n <size> ]
            [ --end | -e <size> ] [ -d | --disable ] [ -l | --list ]`,
    examples: [
        `{prefix}worldborder -o 10000 -n 5000 -e 10000`,
        `{prefix}worldborder --overworld 10000 --nether 5000`,
        `{prefix}worldborder --overworld 10000`,
        `{prefix}worldborder --nether 5000`,
        `{prefix}worldborder -n 5000`,
        `{prefix}worldborder disable`,
        `{prefix}worldborder -l`,
        `{prefix}worldborder --list`,
    ],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/mashup_world.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "World Border Management",
        description: "Manage the world border settings for each dimension.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Overworld Border",
                description: "Set the border size for the Overworld.",
                requiredFields: ["overworldSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set Nether Border",
                description: "Set the border size for the Nether.",
                requiredFields: ["netherSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set End Border",
                description: "Set the border size for the End.",
                requiredFields: ["endSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set Overworld and Nether Borders",
                description: "Set the border sizes for both the Overworld and Nether.",
                requiredFields: ["overworldSize", "netherSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set Overworld and End Borders",
                description: "Set the border sizes for both the Overworld and End.",
                requiredFields: ["overworldSize", "endSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set Nether and End Borders",
                description: "Set the border sizes for both the Nether and End.",
                requiredFields: ["netherSize", "endSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Set All Borders",
                description: "Set the border sizes for the Overworld, Nether, and End.",
                requiredFields: ["overworldSize", "netherSize", "endSize"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Disable World Border",
                command: ["--disable"],
                description: "Disable all world borders.",
                requiredFields: [],
                crypto: false,
            },
            {
                name: "List World Border Settings",
                command: ["--list"],
                description: "View the current world border settings.",
                requiredFields: [],
                crypto: false,
            },
        ],
        dynamicFields: [
            { name: "\nOverworld Border Size:", type: "text", placeholder: "Enter Overworld Size", requiredFields: ["overworldSize"], arg: "--overworld" },
            { name: "\nNether Border Size:", type: "text", placeholder: "Enter Nether size", requiredFields: ["netherSize"], arg: "--nether" },
            { name: "\nEnd Border Size:", type: "text", placeholder: "Enter End Size", requiredFields: ["endSize"], arg: "--end" },
        ],
    },

    /**
     * Executes the worldborder command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        const player = message.sender;
        const moduleKey = "worldBorderCheck_b";

        const moduleData = paradoxModulesDB.get(moduleKey) ?? {
            enabled: false,
            settings: { overworld: 0, nether: 0, end: 0 },
        };
        const borderSettings = moduleData?.settings ?? { overworld: 0, nether: 0, end: 0 };
        const isEnabled = moduleData?.enabled ?? false;

        const parseSize = (value: string | undefined, fallback = 0) => {
            const parsed = parseInt(value ?? "", 10);
            return isNaN(parsed) ? fallback : Math.abs(parsed);
        };

        if (args.includes("--disable") || args.includes("-d")) {
            await paradoxModulesDB.set(moduleKey, { enabled: false, settings: borderSettings });
            stopWorldBorderCheck();
            player.sendMessage("§2[§7Paradox§2]§o§7 World Border has been §4disabled§7.");
            return;
        }

        if (args.includes("--list") || args.includes("-l")) {
            player.sendMessage(
                [
                    `§2[§7Paradox§2]§o§7 Current World Border Settings:`,
                    `  | §7Enabled: ${isEnabled ? "§aYes§7" : "§cNo§7"}`,
                    `  | §7Overworld: §f${borderSettings.overworld}`,
                    `  | §7Nether: §f${borderSettings.nether}`,
                    `  | §7End: §f${borderSettings.end}`,
                ].join("\n")
            );
            return;
        }

        const updated = { ...borderSettings };
        for (let i = 0; i < args.length; i++) {
            const arg = args[i].toLowerCase();
            switch (arg) {
                case "--overworld":
                case "-o":
                    updated.overworld = parseSize(args[i + 1]);
                    break;
                case "--nether":
                case "-n":
                    updated.nether = parseSize(args[i + 1]);
                    break;
                case "--end":
                case "-e":
                    updated.end = parseSize(args[i + 1]);
                    break;
            }
        }

        if (updated.overworld === borderSettings.overworld && updated.nether === borderSettings.nether && updated.end === borderSettings.end) {
            player.sendMessage("§o§c[Paradox] No new border sizes provided.");
            return;
        }

        await paradoxModulesDB.set(moduleKey, { enabled: true, settings: updated });
        startWorldBorderCheck();

        player.sendMessage(
            [
                `§2[§7Paradox§2]§o§7 World Border has been ${isEnabled ? "§aupdated§7" : "§aenabled§7"}!`,
                `  | §fOverworld§7: §2[ §7${updated.overworld}§2 ]§7`,
                `  | §fNether§7: §2[ §7${updated.nether}§2 ]§7`,
                `  | §fEnd§7: §2[ §7${updated.end}§2 ]§f`,
            ].join("\n")
        );
    },
};
