import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startGameModeCheck, stopGameModeCheck } from "../../modules/game-mode-module";
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
 * Retrieves the current gamemode module configuration from the database.
 *
 * @returns {Promise<ModeStates>} Formatted gamemode state configuration object.
 */
async function fetchGamemodeState(): Promise<ModeStates> {
    const gamemodeEntry = (await paradoxModulesDB.get("gamemodeCheck_b")) ?? {
        enabled: true,
        settings: {
            Adventure: true,
            Creative: true,
            Survival: true,
            Spectator: true,
        },
    };

    return {
        gamemodeCheck: gamemodeEntry.enabled,
        Adventure: gamemodeEntry.settings?.Adventure ?? true,
        Creative: gamemodeEntry.settings?.Creative ?? true,
        Survival: gamemodeEntry.settings?.Survival ?? true,
        Spectator: gamemodeEntry.settings?.Spectator ?? true,
    };
}

/**
 * Formats the current gamemode settings state into a chat display message.
 *
 * @param {ModeStates} state - Current gamemode configuration state.
 * @returns {string} Formatted multiline chat string.
 */
function formatSettingsMessage(state: ModeStates): string {
    return [
        `§2[§7Paradox§2]§o§7 Current Game Mode Settings:`,
        `  | Adventure: ${state.Adventure ? "§aAllowed§7" : "§2Disallowed§7"}`,
        `  | Creative: ${state.Creative ? "§aAllowed§7" : "§2Disallowed§7"}`,
        `  | Survival: ${state.Survival ? "§aAllowed§7" : "§2Disallowed§7"}`,
        `  | Spectator: ${state.Spectator ? "§aAllowed§7" : "§2Disallowed§7"}`,
        `  | Gamemode Checks: ${state.gamemodeCheck ? "§aEnabled§7" : "§4Disabled§7"}`,
    ].join("\n");
}

/**
 * Processes dynamic flag arguments to update the state object.
 *
 * @param {string[]} args - Command arguments passed by player.
 * @param {ModeStates} state - Mutable state configuration to update.
 * @returns {{ isValid: boolean; needsInspectionUpdate: boolean }} Parsing result metadata.
 */
function parseGamemodeArgs(args: string[], state: ModeStates): { isValid: boolean; needsInspectionUpdate: boolean } {
    let needsInspectionUpdate = false;

    for (const arg of args) {
        switch (arg.toLowerCase()) {
            case "-a":
                state.Adventure = !state.Adventure;
                needsInspectionUpdate = true;
                break;
            case "-c":
                state.Creative = !state.Creative;
                needsInspectionUpdate = true;
                break;
            case "-s":
                state.Survival = !state.Survival;
                needsInspectionUpdate = true;
                break;
            case "-sp":
                state.Spectator = !state.Spectator;
                needsInspectionUpdate = true;
                break;
            case "-e":
            case "--enable":
                state.gamemodeCheck = true;
                needsInspectionUpdate = true;
                break;
            case "-d":
            case "--disable":
                state.gamemodeCheck = false;
                break;
            default:
                return { isValid: false, needsInspectionUpdate: false };
        }
    }

    return { isValid: true, needsInspectionUpdate };
}

/**
 * Validates whether at least one game mode remains active when enforcement is enabled.
 *
 * @param {ModeStates} state - Target state configuration to validate.
 * @returns {boolean} True if state is valid, false if all gamemodes are disabled while check is active.
 */
function isGamemodeStateValid(state: ModeStates): boolean {
    if (!state.gamemodeCheck) return true;
    const modes: (keyof ModeSettings)[] = ["Adventure", "Creative", "Survival", "Spectator"];
    return modes.some((mode) => state[mode]);
}

/**
 * Persists the updated gamemode settings to the database and syncs background check routines.
 *
 * @param {Player} player - Player executing the configuration update.
 * @param {ModeStates} state - Updated mode settings.
 * @param {boolean} needsInspectionUpdate - Whether to start/re-initialize the gamemode check loop.
 */
async function saveAndSyncGamemodeState(player: Player, state: ModeStates, needsInspectionUpdate: boolean): Promise<void> {
    await paradoxModulesDB.set("gamemodeCheck_b", {
        enabled: state.gamemodeCheck,
        settings: {
            Adventure: state.Adventure,
            Creative: state.Creative,
            Survival: state.Survival,
            Spectator: state.Spectator,
        },
    });

    player.sendMessage(formatSettingsMessage(state));

    if (!state.gamemodeCheck) {
        stopGameModeCheck();
    } else if (needsInspectionUpdate) {
        startGameModeCheck();
    }
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
            {
                name: "Toggle Game Modes",
                requiredFields: ["toggleGameMode"],
                generateModalForm: true,
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
     * @param {ChatSendBeforeEvent | undefined} message - The message object context.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const modeStates = await fetchGamemodeState();

        if (args.includes("-l") || args.includes("--list")) {
            player.sendMessage(formatSettingsMessage(modeStates));
            return;
        }

        const { isValid, needsInspectionUpdate } = parseGamemodeArgs(args, modeStates);

        if (!isValid) {
            const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
            player.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§cgamemode help.`);
            return;
        }

        if (!isGamemodeStateValid(modeStates)) {
            player.sendMessage("§o§c[Paradox] You cannot disable all game modes. At least one must remain enabled.");
            return;
        }

        await saveAndSyncGamemodeState(player, modeStates, needsInspectionUpdate);
    },
};
