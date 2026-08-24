import { ChatSendBeforeEvent, GameMode, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";

/**
 * Represents the switchgamemode command.
 */
export const switchGamemodeCommand: Command = {
    name: "switchgamemode",
    description: "Switch your game mode.",
    usage: "{prefix}switchgamemode <mode>",
    examples: ["{prefix}switchgamemode survival", "{prefix}switchgamemode creative", "{prefix}switchgamemode adventure", "{prefix}switchgamemode spectator"],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/icon_setting.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Game Mode Manager",
        description:
            "Change your current game mode.\n\n" + "§7• §fSurvival§7: Normal survival gameplay.\n" + "§7• §fCreative§7: Unlimited resources and flight.\n" + "§7• §fAdventure§7: Adventure gameplay.\n" + "§7• §fSpectator§7: Spectator mode.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Change Game Mode",
                description: "Change your game mode.",
                requiredFields: ["mode"],
                generateModalForm: true,
                icon: "textures/ui/icon_setting.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Game Mode:",
                type: "dropdown",
                options: ["survival", "creative", "adventure", "spectator"],
                requiredFields: ["mode"],
            },
        ],
    },

    /**
     * Executes the switchgamemode command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";

        if (args.length < 1) {
            player.sendMessage(`§o§c[Paradox] Usage: ${prefix}switchgamemode <survival|creative|adventure|spectator>`);
            return;
        }

        const modeInput = args[0].trim().toLowerCase();

        const modes: Record<string, GameMode> = {
            survival: GameMode.Survival,
            s: GameMode.Survival,
            creative: GameMode.Creative,
            c: GameMode.Creative,
            adventure: GameMode.Adventure,
            a: GameMode.Adventure,
            spectator: GameMode.Spectator,
            sp: GameMode.Spectator,
        };

        const targetMode = modes[modeInput];

        if (!targetMode) {
            player.sendMessage(`§o§c[Paradox] Invalid game mode "${modeInput}".`);
            player.sendMessage("§7Available modes: §fsurvival, creative, adventure, spectator");
            return;
        }

        try {
            player.setGameMode(targetMode);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your game mode is now: §a${targetMode}§7.`);
        } catch (error) {
            player.sendMessage(`§o§c[Paradox] Failed to set game mode: ${error}`);
        }
    },
};
