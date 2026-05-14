import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MessageFormData } from "@minecraft/server-ui";
import { paradoxVersion } from "../../data/versioning";
import { openMainGui } from "../gui/form-generator";

/**
 * Displays Paradox AntiCheat info in a GUI-friendly form.
 * Accessible by all players (security clearance level 1).
 */
export const paradoxInfoCommand: Command = {
    name: "info",
    description: "Displays project information for Paradox.",
    usage: "{prefix}info",
    examples: ["{prefix}info"],
    icon: "textures/ui/blue_info_glyph.png",
    category: "Utility",
    securityClearance: 1,
    guiInstructions: {
        formType: "ActionFormData",
        title: "Paradox AC Info",
        description:
            "View detailed information about the Paradox AntiCheat project.\n\n" + "§7• See the current version and license.\n" + "§7• Access official GitHub, Discord, and Wiki links.\n" + "§7• Learn about the project's goals and authors.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "View Paradox Info",
                icon: "textures/ui/infobulb_darkborder_small.png",
                description: "Open a detailed info form about Paradox AntiCheat.",
            },
        ],
    },

    execute: (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        const sender = message.sender;

        // Function to show the MessageFormData, retrying if player is busy
        const showInfoForm = (sender: Player) => {
            const version = `${paradoxVersion}`;
            const author = "Visual1mpact";
            const coAuthor = "Pete9xi";
            const github = "github.com/Visual1mpact/Paradox_AntiCheat";
            const license = "GPL-3.0";
            const discordFull = "discord.gg/7Nh7UnkbdU";
            const wiki = "visual1mpact.github.io/Paradox_AntiCheat/#/";

            const descriptionText =
                `Paradox AntiCheat is a high-performance anti-cheat system for Minecraft Bedrock. ` +
                `It is designed to detect and prevent cheating in both Realms and BDS environments, ` +
                `ensuring a fair gameplay experience for all players.\n\n` +
                `The name "Paradox" reflects our approach: a system that uses sophisticated algorithms ` +
                `and advanced detection techniques to outsmart cheaters in ways that might seem counterintuitive at first glance.\n`;

            let infoText =
                "§2============================\n" +
                "§7Paradox AntiCheat - Server Info\n" +
                "§2============================\n\n" +
                "§6Version\n" +
                `§f${version}\n\n` +
                "§6License\n" +
                `§f${license}\n\n` +
                "§6Authors\n" +
                `§f• Author: ${author}\n` +
                `§f• Co-Author: ${coAuthor}\n\n` +
                "§6Links\n" +
                `§f• GitHub: ${github}\n` +
                `§f• Discord: ${discordFull}\n` +
                `§f• Wiki: ${wiki}\n\n` +
                "§6Description\n" +
                `§f${descriptionText.replace(/\n/g, "\n§f")}\n` +
                "§2============================";

            // Create and show the form to the player
            const form = new MessageFormData().title("                Paradox Info").body(infoText).button1("Close").button2("Back");

            form.show(sender)
                .then((response) => {
                    if (response.canceled) {
                        if (response.cancelationReason === "UserBusy") {
                            showInfoForm(sender);
                        }
                        return;
                    }
                    if (response.selection === 1) {
                        openMainGui(sender);
                    }
                })
                .catch((err) => console.error(err));
        };

        // Inform player to close chat for GUI display
        sender.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view info.");

        // Show the info form
        showInfoForm(sender);
    },
};
