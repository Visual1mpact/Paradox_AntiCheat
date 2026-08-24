import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startGameModeCheck, stopGameModeCheck } from "../../modules/game-mode";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

// Represents the game mode settings stored in the database
interface ModeSettings {
    Adventure: boolean;
    Creative: boolean;
    Survival: boolean;
    Spectator: boolean;
}

// Represents the full mode states including the gamemode check
interface ModeStates extends ModeSettings {
    gamemodeCheck: boolean;
}

/**
 * Represents the gamemode command.
 */
export const gameModeCommand: Command = {
    name: "gamemode",
    description: "Allows or disallows game modes, and lists current configurations.",
    usage: "{prefix}gamemode [ -a | -c | -s | -sp | -e | -d | --enable | --disable | -l | --list ]",
    examples: [`{prefix}gamemode -a`, `{prefix}gamemode -c -s`, `{prefix}gamemode -a -c -sp`, `{prefix}gamemode --enable`, `{prefix}gamemode --disable`, `{prefix}gamemode -l`, `{prefix}gamemode --list`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/multiselection.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Configure Game Modes",
        description:
            "Manage which game modes are allowed on the server and control gamemode checks.\n\n" +
            "§7• §fToggle Game Modes§7: Enable or disable Adventure, Creative, Survival, or Spectator modes.\n" +
            "§7• §fEnable/Disable Gamemode Check§7: Turn the gamemode enforcement system on or off.\n" +
            "§7• §fList Current Configurations§7: See the current status of all game modes and the gamemode check.\n\n" +
            "§7Game Mode Rules:\n" +
            "§7• At least one game mode must remain enabled.\n" +
            "§7• Disabled modes cannot be entered by players until re-enabled.\n" +
            "§7• Gamemode checks automatically enforce allowed modes for all players.\n\n",
        commandOrder: "command-arg",
        actions: [
            // Single button to generate modal form with toggles for game modes
            {
                name: "Toggle Game Modes",
                requiredFields: ["toggleGameMode"],
                generateModalForm: true, // This triggers a modal form with toggles
                icon: "textures/ui/multiselection.png",
                description: "Open a form to toggle which game modes are allowed on the server.",
            },
            { name: "Enable Game Modes", command: ["--enable"], generateModalForm: false, icon: "textures/ui/realms_green_check.png", description: "Enable all game modes on the server." },
            { name: "Disable Game Modes", command: ["--disable"], generateModalForm: false, icon: "textures/ui/realms_red_x.png", description: "Disable all game modes on the server." },
            { name: "List Current Configurations", command: ["--list"], generateModalForm: false, icon: "textures/ui/icon_sign.png", description: "Display the current status of all game modes and the gamemode check." },
        ],
        dynamicFields: [
            { name: "\nToggle Adventure Mode", arg: "-a", type: "toggle", requiredFields: ["toggleGameMode"] },
            { name: "\nToggle Creative Mode", arg: "-c", type: "toggle", requiredFields: ["toggleGameMode"] },
            { name: "\nToggle Survival Mode", arg: "-s", type: "toggle", requiredFields: ["toggleGameMode"] },
            { name: "\nToggle Spectator Mode", arg: "-sp", type: "toggle", requiredFields: ["toggleGameMode"] },
        ],
    },

    /**
     * Executes the gamemode command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const gamemodeEntry = (await paradoxModulesDB.get("gamemodeCheck_b")) ?? {
            enabled: true,
            settings: {
                Adventure: true,
                Creative: true,
                Survival: true,
                Spectator: true,
            },
        };

        const modeStates: ModeStates = {
            gamemodeCheck: gamemodeEntry.enabled,
            Adventure: gamemodeEntry.settings?.Adventure ?? true,
            Creative: gamemodeEntry.settings?.Creative ?? true,
            Survival: gamemodeEntry.settings?.Survival ?? true,
            Spectator: gamemodeEntry.settings?.Spectator ?? true,
        };

        const formatSettingsMessage = (modeStates: ModeStates): string => {
            return [
                `§2[§7Paradox§2]§o§7 Current Game Mode Settings:`,
                `  | Adventure: ${modeStates.Adventure ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Creative: ${modeStates.Creative ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Survival: ${modeStates.Survival ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Spectator: ${modeStates.Spectator ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Gamemode Checks: ${modeStates.gamemodeCheck ? "§aEnabled§7" : "§4Disabled§7"}`,
            ].join("\n");
        };

        if (args.includes("-l") || args.includes("--list")) {
            player.sendMessage(formatSettingsMessage(modeStates));
            return;
        }

        let needsInspectionUpdate = false;

        for (const arg of args) {
            switch (arg.toLowerCase()) {
                case "-a":
                    modeStates.Adventure = !modeStates.Adventure;
                    needsInspectionUpdate = true;
                    break;
                case "-c":
                    modeStates.Creative = !modeStates.Creative;
                    needsInspectionUpdate = true;
                    break;
                case "-s":
                    modeStates.Survival = !modeStates.Survival;
                    needsInspectionUpdate = true;
                    break;
                case "-sp":
                    modeStates.Spectator = !modeStates.Spectator;
                    needsInspectionUpdate = true;
                    break;
                case "-e":
                case "--enable":
                    modeStates.gamemodeCheck = true;
                    needsInspectionUpdate = true;
                    break;
                case "-d":
                case "--disable":
                    modeStates.gamemodeCheck = false;
                    break;
                default:
                    const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
                    player.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§cgamemode help.`);
                    return;
            }
        }

        if (modeStates.gamemodeCheck) {
            const enabledModes = ["Adventure", "Creative", "Survival", "Spectator"].filter((mode) => modeStates[mode as keyof ModeSettings]);
            if (enabledModes.length === 0) {
                player.sendMessage("§o§c[Paradox] You cannot disable all game modes. At least one must remain enabled.");
                return;
            }
        }

        await paradoxModulesDB.set("gamemodeCheck_b", {
            enabled: modeStates.gamemodeCheck,
            settings: {
                Adventure: modeStates.Adventure,
                Creative: modeStates.Creative,
                Survival: modeStates.Survival,
                Spectator: modeStates.Spectator,
            },
        });

        player.sendMessage(formatSettingsMessage(modeStates));

        if (!modeStates.gamemodeCheck) {
            stopGameModeCheck();
        } else if (needsInspectionUpdate) {
            startGameModeCheck();
        }
    },
};
