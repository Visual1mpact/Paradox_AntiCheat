import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startGameModeCheck, stopGameModeCheck } from "../../modules/game-mode";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

// Represents the game mode settings stored in the database
interface ModeSettings {
    adventure: boolean;
    creative: boolean;
    survival: boolean;
    spectator: boolean;
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
        description: "Toggle game modes and enable or disable gamemode checks.\n\n",
        commandOrder: "command-arg",
        actions: [
            // Single button to generate modal form with toggles for game modes
            {
                name: "Toggle Game Modes",
                requiredFields: ["toggleGameMode"],
                generateModalForm: true, // This triggers a modal form with toggles
                icon: "textures/ui/multiselection.png",
            },
            { name: "Enable Game Modes", command: ["--enable"], generateModalForm: false, icon: "textures/ui/realms_green_check.png" },
            { name: "Disable Game Modes", command: ["--disable"], generateModalForm: false, icon: "textures/ui/realms_red_x.png" },
            { name: "List Current Configurations", command: ["--list"], generateModalForm: false, icon: "textures/ui/icon_sign.png" },
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
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        const player = message.sender;

        const gamemodeEntry = paradoxModulesDB.get("gamemodeCheck_b") ?? {
            enabled: true,
            settings: {
                adventure: true,
                creative: true,
                survival: true,
                spectator: true,
            },
        };

        const modeStates: ModeStates = {
            gamemodeCheck: gamemodeEntry.enabled,
            adventure: gamemodeEntry.settings?.adventure ?? true,
            creative: gamemodeEntry.settings?.creative ?? true,
            survival: gamemodeEntry.settings?.survival ?? true,
            spectator: gamemodeEntry.settings?.spectator ?? true,
        };

        const formatSettingsMessage = (modeStates: ModeStates): string => {
            return [
                `§2[§7Paradox§2]§o§7 Current Game Mode Settings:`,
                `  | Adventure: ${modeStates.adventure ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Creative: ${modeStates.creative ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Survival: ${modeStates.survival ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Spectator: ${modeStates.spectator ? "§aAllowed§7" : "§2Disallowed§7"}`,
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
                    modeStates.adventure = !modeStates.adventure;
                    needsInspectionUpdate = true;
                    break;
                case "-c":
                    modeStates.creative = !modeStates.creative;
                    needsInspectionUpdate = true;
                    break;
                case "-s":
                    modeStates.survival = !modeStates.survival;
                    needsInspectionUpdate = true;
                    break;
                case "-sp":
                    modeStates.spectator = !modeStates.spectator;
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
                    const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
                    player.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§cgamemode help.`);
                    return;
            }
        }

        if (modeStates.gamemodeCheck) {
            const enabledModes = ["adventure", "creative", "survival", "spectator"].filter((mode) => modeStates[mode as keyof ModeSettings]);
            if (enabledModes.length === 0) {
                player.sendMessage("§o§c[Paradox] You cannot disable all game modes. At least one must remain enabled.");
                return;
            }
        }

        await paradoxModulesDB.set("gamemodeCheck_b", {
            enabled: modeStates.gamemodeCheck,
            settings: {
                adventure: modeStates.adventure,
                creative: modeStates.creative,
                survival: modeStates.survival,
                spectator: modeStates.spectator,
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
