import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startWorldBorderCheck, stopWorldBorderCheck } from "../../modules/world-border";
import { paradoxModulesDB } from "../../paradox";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "World Border Management",
        description: "Manage the world border settings for each dimension.",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Overworld Border",
                command: ["--overworld"],
                description: "Set the border size for the Overworld.",
                requiredFields: ["overworldSize"],
                crypto: false,
            },
            {
                name: "Set Nether Border",
                command: ["--nether"],
                description: "Set the border size for the Nether.",
                requiredFields: ["netherSize"],
                crypto: false,
            },
            {
                name: "Set End Border",
                command: ["--end"],
                description: "Set the border size for the End.",
                requiredFields: ["endSize"],
                crypto: false,
            },
            {
                name: "Set Overworld and Nether Borders",
                command: ["--overworld", "--nether"],
                description: "Set the border sizes for both the Overworld and Nether.",
                requiredFields: ["overworldSize", "netherSize"],
                crypto: false,
            },
            {
                name: "Set Overworld and End Borders",
                command: ["--overworld", "--end"],
                description: "Set the border sizes for both the Overworld and End.",
                requiredFields: ["overworldSize", "endSize"],
                crypto: false,
            },
            {
                name: "Set Nether and End Borders",
                command: ["--nether", "--end"],
                description: "Set the border sizes for both the Nether and End.",
                requiredFields: ["netherSize", "endSize"],
                crypto: false,
            },
            {
                name: "Set All Borders",
                command: ["--overworld", "--nether", "--end"],
                description: "Set the border sizes for the Overworld, Nether, and End.",
                requiredFields: ["overworldSize", "netherSize", "endSize"],
                crypto: false,
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
            { name: "overworldSize", type: "text", placeholder: "Enter Overworld size" },
            { name: "netherSize", type: "text", placeholder: "Enter Nether size" },
            { name: "endSize", type: "text", placeholder: "Enter End size" },
        ],
    },

    /**
     * Executes the worldborder command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();

        const modeKeys = {
            worldBorderCheck: "worldBorderCheck_b",
            worldBorderSettings: "worldBorder_settings",
        };

        // Retrieve current worldborder settings from paradoxModulesDB
        const modeStates = {
            worldBorderCheck: paradoxModulesDB.get(modeKeys.worldBorderCheck) ?? false,
            worldBorderSettings: paradoxModulesDB.get(modeKeys.worldBorderSettings) ?? {
                overworld: 0,
                nether: 0,
                end: 0,
            },
        };

        if (!args.length) {
            const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: {prefix}worldborder <value> [optional]. For help, use ${prefix}worldborder help.`);
            return;
        }

        if (args[0] === "--disable" || args[0] === "-d") {
            player.sendMessage(`§2[§7Paradox§2]§o§7 World Border has been §4disabled§7.`);
            paradoxModulesDB.set(modeKeys.worldBorderCheck, false);
            stopWorldBorderCheck();
            return;
        }

        if (args[0] === "-l" || args[0] === "--list") {
            player.sendMessage(
                [
                    `§2[§7Paradox§2]§o§7 Current World Border Settings:`,
                    `  | §7World Border Check: ${modeStates.worldBorderCheck ? "§aEnabled§7" : "§4disabled§7"}`,
                    `  | §7Overworld Border Size§7: §2[ §f${modeStates.worldBorderSettings.overworld}§2 ]§7`,
                    `  | §7Nether Border Size§7: §2[ §f${modeStates.worldBorderSettings.nether}§2 ]§7`,
                    `  | §7End Border Size§7: §2[ §f${modeStates.worldBorderSettings.end}§2 ]§7`,
                ].join("\n")
            );
            return;
        }

        const paramIndexes: { [key: string]: number } = {
            "--overworld": -1,
            "-o": -1,
            "--nether": -1,
            "-n": -1,
            "--end": -1,
            "-e": -1,
        };

        for (let i = 0; i < args.length; i++) {
            if (paramIndexes[args[i]] !== undefined) {
                paramIndexes[args[i]] = i;
            }
        }

        let overworldSize = modeStates.worldBorderSettings.overworld;
        let netherSize = modeStates.worldBorderSettings.nether;
        let endSize = modeStates.worldBorderSettings.end;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i].toLowerCase();
            switch (arg) {
                case "--overworld":
                case "-o":
                    overworldSize = Number(args[i + 1]);
                    break;
                case "--nether":
                case "-n":
                    netherSize = Number(args[i + 1]);
                    break;
                case "--end":
                case "-e":
                    endSize = Number(args[i + 1]);
                    break;
            }
        }

        if (overworldSize || netherSize || endSize) {
            player.sendMessage(
                [
                    `§2[§7Paradox§2]§o§7 World Border has been ${modeStates.worldBorderCheck ? "§aupdated§7" : "§aenabled§7"}!`,
                    `  | §fOverworld§7: §2[ §7${overworldSize}§2 ]§7`,
                    `  | §fNether§7: §2[ §7${netherSize}§2 ]§7`,
                    `  | §fEnd§7: §2[ §7${endSize}§2 ]§f`,
                ].join("\n")
            );

            paradoxModulesDB.set(modeKeys.worldBorderCheck, true);
            paradoxModulesDB.set(modeKeys.worldBorderSettings, {
                overworld: Math.abs(overworldSize),
                nether: Math.abs(netherSize),
                end: Math.abs(endSize),
            });

            system.run(() => {
                startWorldBorderCheck();
            });
            return;
        }

        const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
        player.sendMessage(`§cInvalid arguments. For help, use ${prefix}worldborder help.`);
    },
};
