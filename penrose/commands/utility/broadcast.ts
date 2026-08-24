import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";

/**
 * Represents the broadcast command.
 *
 * Allows Administrators (Clearance 3+) to send global announcements
 * using Title, Subtitle, and Action Bar UI elements.
 */
export const broadcastCommand: Command = {
    name: "broadcast",
    description: "Sends a global announcement to all players using UI overlays.",
    usage: "{prefix}broadcast -t <title> -s <subtitle> -a <actionbar>",
    examples: ["{prefix}broadcast -t 'Event Starting!' -s 'Head to spawn' -a 'Good luck!'", "{prefix}broadcast -t 'Server Maintenance' -s 'Restarting in 5m'"],
    icon: "textures/ui/creative_icon.png",
    securityClearance: 3,
    category: "Utility",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Global Broadcaster",
        description: "Send a message to everyone on the server.\n\n" + "§7• Title: Large text in center\n" + "§7• Subtitle: Smaller text below Title\n" + "§7• Action Bar: Text above hotbar\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Configure Broadcast",
                securityClearance: 3,
                icon: "textures/ui/multiplayer_glyph_color.png",
                requiredFields: ["Title", "Subtitle", "Actionbar"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                type: "text",
                name: "Main Title:",
                placeholder: "Important Announcement!",
                arg: "-t",
                requiredFields: ["Title"],
            },
            {
                type: "text",
                name: "Subtitle:",
                placeholder: "Don't forget to...",
                arg: "-s",
                requiredFields: ["Subtitle"],
            },
            {
                type: "text",
                name: "Action Bar Message:",
                placeholder: "Quick tip...",
                arg: "-a",
                requiredFields: ["Actionbar"],
            },
        ],
    },

    execute: (message: ChatSendBeforeEvent | undefined, args: string[] | undefined): void => {
        if (!message || !args) return;

        const sender = message.sender;
        let title = "";
        let subtitle = "";
        let actionbar = "";

        const validFlags = new Set(["-t", "--title", "-s", "--subtitle", "-a", "--actionbar"]);

        function captureMultiWordArgument(args: string[]): string {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        }

        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--title":
                    title = captureMultiWordArgument(args);
                    break;
                case "-s":
                case "--subtitle":
                    subtitle = captureMultiWordArgument(args);
                    break;
                case "-a":
                case "--actionbar":
                    actionbar = captureMultiWordArgument(args);
                    break;
            }
        }

        if (!title && !subtitle && !actionbar) {
            sender.sendMessage("§o§c[Paradox] Broadcast failed: You must provide at least one message field.");
            return;
        }

        for (const player of PlayerCache.getPlayers()) {
            if (title || subtitle) {
                player.onScreenDisplay.setTitle(title || " ", {
                    subtitle: subtitle,
                    fadeInDuration: 5, // 0.25 seconds
                    stayDuration: 60, // 3 seconds
                    fadeOutDuration: 5, // 0.25 seconds
                });
            }
            if (actionbar) {
                player.onScreenDisplay.setActionBar(actionbar);
            }
        }

        sender.sendMessage("§2[§7Paradox§2]§o§7 Global broadcast sent successfully.");
    },
};
