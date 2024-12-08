import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startGameModeCheck, stopGameModeCheck } from "../../modules/game-mode";
import { paradoxModulesDB } from "../../paradox";

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

    /**
     * Executes the gamemode command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        const modeKeys = {
            gamemodeCheck: "gamemodeCheck_b",
            settings: "gamemode_settings",
        };

        const modeSettings = paradoxModulesDB.get<ModeSettings>(modeKeys.settings);

        const modeStates: ModeStates = {
            adventure: modeSettings?.adventure ?? true,
            creative: modeSettings?.creative ?? true,
            survival: modeSettings?.survival ?? true,
            spectator: modeSettings?.spectator ?? true,
            gamemodeCheck: paradoxModulesDB.get<boolean>(modeKeys.gamemodeCheck) ?? true,
        };

        const formatSettingsMessage = (modeStates: ModeStates) => {
            const lines = [
                `§2[§7Paradox§2]§o§7 Current Game Mode Settings:`,
                `  | Adventure: ${modeStates.adventure ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Creative: ${modeStates.creative ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Survival: ${modeStates.survival ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Spectator: ${modeStates.spectator ? "§aAllowed§7" : "§2Disallowed§7"}`,
                `  | Gamemode Checks: ${modeStates.gamemodeCheck ? "§aEnabled§7" : "§4Disabled§7"}.`,
            ];
            return lines.join("\n");
        };

        if (args.includes("-l") || args.includes("--list")) {
            player.sendMessage(formatSettingsMessage(modeStates));
            return;
        }

        let needsInspectionUpdate = false;

        args.forEach((arg) => {
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
                    needsInspectionUpdate = false;
                    break;
                default:
                    const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
                    player.sendMessage(`§cInvalid arguments. For help, use ${prefix}gamemode help.`);
                    return;
            }
        });

        if (modeStates.gamemodeCheck) {
            // Use keys from ModeStates interface, excluding `gamemodeCheck`
            const gameModeKeys: (keyof Omit<ModeStates, "gamemodeCheck">)[] = ["adventure", "creative", "survival", "spectator"];

            // Count enabled game modes
            const enabledModes = gameModeKeys.filter((key) => modeStates[key]).length;

            if (enabledModes === 0) {
                player.sendMessage("§cYou cannot disable all game modes. At least one must remain enabled.");
                return;
            }
        }

        paradoxModulesDB.set(modeKeys.gamemodeCheck, modeStates.gamemodeCheck);
        paradoxModulesDB.set(modeKeys.settings, {
            adventure: modeStates.adventure,
            creative: modeStates.creative,
            survival: modeStates.survival,
            spectator: modeStates.spectator,
        });

        player.sendMessage(formatSettingsMessage(modeStates));

        if (!modeStates.gamemodeCheck) {
            system.run(() => {
                stopGameModeCheck();
            });
        } else if ((needsInspectionUpdate && modeStates.gamemodeCheck) || modeStates.gamemodeCheck) {
            system.run(() => {
                startGameModeCheck();
            });
        }
    },
};
