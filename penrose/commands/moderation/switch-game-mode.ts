import { ChatSendBeforeEvent, GameMode } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

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

    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        const sender = message.sender;

        if (args.length < 1) {
            sender.sendMessage("§o§c[Paradox] Usage: !switchgamemode <survival|creative|adventure|spectator>");
            return;
        }

        const modeInput = args[0].replace(/["']/g, "").toLowerCase();

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

        const mode = modes[modeInput as keyof typeof modes];

        if (!mode) {
            sender.sendMessage(`§o§c[Paradox] Invalid game mode "${modeInput}".`);
            sender.sendMessage("§7Available modes: §fsurvival, creative, adventure, spectator");
            return;
        }

        sender.setGameMode(mode);
        sender.sendMessage(`§2[§7Paradox§2]§o§7 Your game mode is now: §a${mode}§7.`);
    },
};
