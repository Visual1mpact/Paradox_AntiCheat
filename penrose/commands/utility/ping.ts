import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Ping command to display real-time latency for all online players.
 * Uses the native Player.getPing() API.
 */
export const pingCommand: Command = {
    name: "ping",
    description: "Displays the real-time network latency (ping) for all online players.",
    usage: "{prefix}ping",
    examples: ["{prefix}ping"],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/Ping_Green_Dark.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Network Latency",
        description:
            "Monitor the connection quality of all players currently on the server.\n\n" +
            "§7• View real-time ping in milliseconds (ms).\n" +
            "§7• Color-coded status indicates connection stability.\n" +
            "§7• Useful for identifying lag-related gameplay issues.\n\n",
        actions: [
            {
                name: "Refresh Ping List",
                icon: "textures/ui/refresh_light.png",
            },
        ],
    },

    execute: (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        const sender = message.sender;

        const players = PlayerCache.getPlayers();
        const listOutput = [`§l§2--- Server Latency Monitor ---`];

        // Sort players by ping if available, or just list them
        const sortedPlayers = [...players].sort((a, b) => {
            return (a.getPing() ?? 999) - (b.getPing() ?? 999);
        });

        for (const player of sortedPlayers) {
            const ping = player.getPing();
            let pingDisplay: string;
            let statusLabel: string;

            if (ping === undefined) {
                pingDisplay = "§7Calculating...";
                statusLabel = "§8[UNKNOWN]";
            } else {
                let color = "§a"; // Excellent (< 50ms)
                statusLabel = "§a[EXCELLENT]";

                if (ping >= 50 && ping < 100) {
                    color = "§e";
                    statusLabel = "§e[GOOD]";
                } else if (ping >= 100 && ping < 200) {
                    color = "§6";
                    statusLabel = "§6[AVERAGE]";
                } else if (ping >= 200 && ping < 400) {
                    color = "§c";
                    statusLabel = "§c[POOR]";
                } else if (ping >= 400) {
                    color = "§4";
                    statusLabel = "§4[CRITICAL]";
                }

                pingDisplay = `${color}${ping}ms`;
            }

            listOutput.push(`§7• §f${player.name.padEnd(16)} §8| ${pingDisplay.padStart(10)} §8| ${statusLabel}`);
        }

        listOutput.push(`§2------------------------------`);
        sender.sendMessage(listOutput.join("\n"));
    },
};
