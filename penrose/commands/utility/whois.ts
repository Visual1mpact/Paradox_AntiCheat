import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { spoofDB, playerMetadataDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Represents the whois command.
 *
 * Provides a unified forensic dossier for online and offline players.
 * Scales information based on security clearance (Level 2-4).
 */
export const whoisCommand: Command = {
    name: "whois",
    description: "Provides a detailed forensic dossier on a player (online or offline).",
    usage: "{prefix}whois <player|id> [--clear] | {prefix}whois --clearall",
    examples: ["{prefix}whois Pete9xi", "{prefix}whois Bob --clear", "{prefix}whois --clearall"],
    icon: "textures/ui/magnifying_glass.png",
    securityClearance: 3,
    category: "Utility",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Forensic Dossier",
        description:
            "Investigate player identity and metadata.\n\n" +
            "§7• View platform, join history, and health for online players.\n" +
            "§7• Identify aliases and potential spoofing attempts.\n" +
            "§7• Admins (Lvl 4) can view internal IDs and clear spoof logs.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Lookup Player",
                securityClearance: 3,
                icon: "textures/ui/magnifying_glass.png",
                requiredFields: ["query"],
                generateModalForm: true,
            },
            {
                name: "Clear All Identity Logs",
                securityClearance: 4,
                command: ["--clearall"],
                icon: "textures/ui/trash_default.png",
            },
        ],
        dynamicFields: [
            {
                type: "text",
                name: "Player Name or ID:",
                placeholder: "Pete9xi...",
                arg: "",
                requiredFields: ["query"],
            },
            {
                type: "toggle",
                name: "Clear Spoof History",
                arg: "--clear",
                securityClearance: 4,
                requiredFields: ["query"],
            },
        ],
    },

    execute: async (message: ChatSendBeforeEvent | undefined, args: string[] | undefined): Promise<void> => {
        if (!message || !args) return;

        const sender = message.sender;
        const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 1;
        const isClearAll = args.includes("--clearall");
        const isClear = args.includes("--clear");

        // Handle global database wipe (Level 4 only)
        if (isClearAll) {
            if (senderClearance < 4) {
                sender.sendMessage("§o§c[Paradox] Clearance Level 4 required to wipe identity logs.");
                return;
            }
            await spoofDB.set("players", {});
            sender.sendMessage("§2[§7Paradox§2]§o§7 Global identity logs have been cleared.");
            return;
        }

        const query = args
            .filter((a) => a !== "--clear")
            .join(" ")
            .trim()
            .replace(/["@]/g, "");

        if (!query) {
            sender.sendMessage("§o§c[Paradox] Please provide a player name or ID.");
            return;
        }

        // 1. Resolve Identity (Database first to handle aliases/IDs)
        const spoofData = spoofDB.get("players") ?? {};
        const matchedEntry = Object.entries(spoofData).find(([id, record]) => {
            return id === query || record.name.toLowerCase() === query.toLowerCase() || record.knownNames.some((n) => n.toLowerCase() === query.toLowerCase());
        });

        // Determine the stable Paradox ID. If not in DB, try a quick online name lookup.
        const targetId = matchedEntry ? matchedEntry[0] : (PlayerCache.getPlayerByName(query)?.id ?? "");

        if (!targetId) {
            sender.sendMessage(`§o§c[Paradox] No records found for "${query}".`);
            return;
        }

        // 2. Resolve Online Instance (Fetch by ID for stability, or check for Paradox Alias)
        let onlineTarget = PlayerCache.getPlayerById(targetId) || [...PlayerCache.getPlayers()].find((p) => p.getDynamicProperty("paradoxAlias")?.toString().toLowerCase() === query.toLowerCase());

        const record = matchedEntry ? matchedEntry[1] : undefined;

        // Handle single record clear (Level 4 only)
        if (isClear) {
            if (senderClearance < 4) {
                sender.sendMessage("§o§c[Paradox] Clearance Level 4 required to clear identity records.");
                return;
            }
            delete spoofData[targetId];
            await spoofDB.set("players", spoofData);
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Identity record for "${query}" removed.`);
            return;
        }

        // 2. Aggregate Data
        const metadata = playerMetadataDB.get(targetId);
        const clearance = onlineTarget ? ((onlineTarget.getDynamicProperty("securityClearance") as number) ?? 1) : "Offline";
        const currentPlatform = onlineTarget ? (onlineTarget.clientSystemInfo.platformType ?? "Unknown") : "N/A";

        const formatTimestamp = (timestamp: number | undefined): string => {
            if (timestamp === undefined) return "N/A";
            return new Date(timestamp).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" });
        };

        const aliases = record?.knownNames?.filter((n) => n.toLowerCase() !== query.toLowerCase()) ?? [];
        const aliasText = aliases.length > 0 ? `§e${aliases.join(", ")}` : "§fNone";
        const spoofFlag = (record?.spoofAttempts?.length ?? 0) > 0 ? " §c[SPOOF_RISK]" : "";

        let health = "N/A";
        let position = "N/A";
        let dimension = "N/A";

        if (onlineTarget) {
            const healthComp = onlineTarget.getComponent("minecraft:health");
            health = healthComp ? `${Math.round(healthComp.currentValue)}/${Math.round(healthComp.effectiveMax)}` : "N/A";
            position = `${Math.round(onlineTarget.location.x)}, ${Math.round(onlineTarget.location.y)}, ${Math.round(onlineTarget.location.z)}`;
            dimension = onlineTarget.dimension.id.replace("minecraft:", "").toUpperCase();
        }

        const dossier = [
            `§l§2--- Paradox Dossier: ${onlineTarget?.name ?? record?.name ?? query}${spoofFlag} ---`,
            `§7Clearance: §fLevel ${clearance}`,
            `§7Current Platform:  §f${currentPlatform}`,
            `§7First Platform:    §f${metadata?.firstPlatform ?? "Unknown"}`,
            `§7Aliases:   ${aliasText}`,
            `§7First Joined: §f${metadata?.joinDate ?? "N/A"}`,
            `§7Last Seen:  §f${formatTimestamp(metadata?.lastSeen)}`,
            `§7Dimension: §f${dimension}`,
            `§7Position:  §f${position}`,
            `§7Health:    §f${health}`,
        ];

        // 3. Level 4 Restricted Forensic Data
        if (senderClearance === 4) {
            dossier.push(`§b[Forensic Data]`);
            dossier.push(`§7Stored ID: §f${targetId}`);
            if (record?.spoofAttempts && record.spoofAttempts.length > 0) {
                dossier.push(`§7Spoof Attempts: §c${record.spoofAttempts.length} detected`);
                record.spoofAttempts.slice(-3).forEach((attempt) => {
                    dossier.push(` §8- ${attempt.name} (${formatTimestamp(attempt.timestamp)})`);
                });
            }
        }

        dossier.push(`§2----------------------------------`);

        // Send the report privately to the moderator
        sender.sendMessage(dossier.join("\n"));
    },
};
