import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { flagsDB } from "../../event-listeners/world-initialize";

/**
 * Represents the flags command.
 * Allows inspection, management, and clearing of player violation logs.
 */
export const flagsCommand: Command = {
    name: "flags",
    description: "Inspects, filters, or clears violation flag logs for specified players.",
    usage: "{prefix}flags <player> [clear] OR {prefix}flags clearall",
    examples: [`{prefix}flags PlayerName`, `{prefix}flags PlayerName clear`, `{prefix}flags clearall`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/accessibility_glyph_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Flag History Logs",
        description:
            "Review accumulated anti-cheat violations and timestamped logs.\n\n" +
            "§7• §fOnline Selection§7: Pick active players directly from the server list.\n" +
            "§7• §fSearch/Offline§7: Enter exact case-sensitive gamer tag to query database.\n" +
            "§7• §fClear Records§7: Purge specific or global violation logs following review.\n\n",
        commandOrder: "arg-command", // Changed from "command-arg" to correctly output !flags <player> clear
        actions: [
            {
                name: "Inspect Player Flags",
                description: "View violation log breakdown for a specific player",
                icon: "textures/ui/magnifying_glass.png",
                generateSubActions: true,
                subActions: [
                    {
                        name: "Online Player",
                        requiredFields: ["onlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_online_icon.png",
                    },
                    {
                        name: "Offline / Manual Search",
                        requiredFields: ["offlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_offline_icon.png",
                    },
                ],
            },
            {
                name: "Clear Player Flags",
                description: "Purge recorded violation history for a player",
                icon: "textures/ui/icon_trash.png",
                generateSubActions: true,
                subActions: [
                    {
                        name: "Online Player",
                        command: ["clear"],
                        requiredFields: ["onlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_online_icon.png",
                    },
                    {
                        name: "Offline / Manual Search",
                        command: ["clear"],
                        requiredFields: ["offlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_offline_icon.png",
                    },
                ],
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Online Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["onlinePlayerName"],
            },
            {
                name: "\nEnter Player Name:",
                type: "text",
                placeholder: "Case-sensitive name",
                requiredFields: ["offlinePlayerName"],
            },
        ],
    },

    /**
     * Executes the flags command.
     * @param {ChatSendBeforeEvent} message - The chat event triggering the command.
     * @param {string[]} args - Command arguments.
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        if (!message || !message.sender) return;

        const sender = message.sender;

        const firstArg = args?.[0];
        if (!firstArg) {
            sender.sendMessage("§o§c[Paradox] Usage: {prefix}flags <player> [clear]");
            return;
        }

        const actionOrName = firstArg.toLowerCase();

        // Sub-command: Clear all database entries
        if (actionOrName === "clearall") {
            await flagsDB.clear();
            sender.sendMessage("§2[§7Paradox§2]§o§7 All recorded violation logs have been successfully cleared.");
            return;
        }

        let inputTargetName = firstArg.replace(/["@]/g, "").trim();
        const subAction = args[1]?.toLowerCase();

        let targetId: string | undefined;
        let resolvedPlayerName = inputTargetName;

        // 1. Try resolving online target first
        const onlineTarget: Player | undefined = PlayerCache.getPlayerByName(inputTargetName);

        if (onlineTarget) {
            targetId = onlineTarget.id;
            resolvedPlayerName = onlineTarget.name;
        } else {
            // 2. Offline lookup: Compare input against stored DB records (case-insensitive fallback with exact case preservation)
            const allEntries = await flagsDB.entries();
            const matchedEntry = allEntries.find(([_, record]) => record.playerName === inputTargetName) ?? allEntries.find(([_, record]) => record.playerName.toLowerCase() === inputTargetName.toLowerCase());

            if (matchedEntry) {
                targetId = matchedEntry[0] as string;
                resolvedPlayerName = matchedEntry[1].playerName;
            }
        }

        if (!targetId) {
            sender.sendMessage(`§o§c[Paradox] No recorded flags or online player found for "${inputTargetName}".`);
            return;
        }

        // Action: Clear specific player flags
        if (subAction === "clear") {
            await flagsDB.delete(targetId);
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Cleared all flag records for player "${resolvedPlayerName}".`);
            return;
        }

        // Action: Query and output flag records
        const record = await flagsDB.get(targetId);

        if (!record || record.flags.length === 0) {
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${resolvedPlayerName}" has a clean record (0 flags).`);
            return;
        }

        sender.sendMessage(`\n§2--- [§7Flag History: ${record.playerName}§2] ---§r`);
        sender.sendMessage(`§7Total Recorded Violations: §e${record.totalViolations}§r`);

        // Display up to 10 most recent flags
        const recentFlags = record.flags.slice(-10).reverse();
        for (const entry of recentFlags) {
            const formattedTime = new Date(entry.timestamp).toLocaleTimeString();
            sender.sendMessage(`§7[${entry.date.split("T")[0]} ${formattedTime}] §c${entry.flagType} §7(x${entry.count}): §f${entry.details}`);
        }

        if (record.flags.length > 10) {
            sender.sendMessage(`§o§7...and ${record.flags.length - 10} older violation entries.`);
        }
    },
};
