import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { playerMetadataDB } from "../../event-listeners/world-initialize";
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
    usage: "{prefix}whois <player|id>",
    examples: ["{prefix}whois Pete9xi", "{prefix}whois Bob"],
    icon: "textures/ui/magnifying_glass.png",
    securityClearance: 3,
    category: "Utility",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Forensic Dossier",
        description: "Investigate player identity and metadata.\n\n" + "§7• View platform, join history, and health for online players.\n" + "§7• Search by player name or unique ID.\n" + "§7• Admins (Lvl 4) can view internal system IDs.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Lookup Player",
                securityClearance: 3,
                icon: "textures/ui/magnifying_glass.png",
                requiredFields: ["query"],
                generateModalForm: true,
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
        ],
    },

    execute: async (message: ChatSendBeforeEvent | undefined, args: string[] | undefined): Promise<void> => {
        if (!message || !args) return;

        const sender = message.sender;

        const query = args.join(" ").trim().replace(/["@]/g, "");

        if (!query) {
            sender.sendMessage("§o§c[Paradox] Please provide a player name or ID.");
            return;
        }

        // 1. Resolve Identity
        let targetId: string | undefined = undefined;

        // Try looking up via online cache first
        const onlineByName = PlayerCache.getPlayerByName(query);
        if (onlineByName) {
            targetId = onlineByName.id;
        } else {
            // Fallback: If query itself is a valid ID inside our metadata DB
            const storedMetadata = await playerMetadataDB.get(query);
            if (storedMetadata) {
                targetId = query;
            }
        }

        if (!targetId) {
            sender.sendMessage(`§o§c[Paradox] No player or identity record found for "${query}".`);
            return;
        }

        // 2. Resolve Online Instance
        let onlineTarget = PlayerCache.getPlayerById(targetId) || [...PlayerCache.getPlayers()].find((p) => p.getDynamicProperty("paradoxAlias")?.toString().toLowerCase() === query.toLowerCase());

        // 3. Aggregate Data
        const metadata = await playerMetadataDB.get(targetId);
        const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 1;
        const clearance = onlineTarget ? ((onlineTarget.getDynamicProperty("securityClearance") as number) ?? 1) : "Offline";
        const currentPlatform = onlineTarget ? (onlineTarget.clientSystemInfo.platformType ?? "Unknown") : "N/A";

        const formatTimestamp = (timestamp: number | undefined): string => {
            if (timestamp === undefined) return "N/A";
            return new Date(timestamp).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" });
        };

        let health = "N/A";
        let healthBar = "";
        let position = "N/A";
        let dimension = "N/A";
        let ping = "N/A";

        if (onlineTarget) {
            const healthComp = onlineTarget.getComponent("minecraft:health");
            if (healthComp) {
                const current = Math.round(healthComp.currentValue);
                const max = Math.round(healthComp.effectiveMax);
                const percent = current / max;
                const bars = 10;
                healthBar = ` §8[§2${"|".repeat(Math.floor(percent * bars))}§7${"|".repeat(bars - Math.floor(percent * bars))}§8]`;
                health = `§a${current}§7/§2${max}${healthBar}`;
            }
            position = `§f${Math.round(onlineTarget.location.x)}§7, §f${Math.round(onlineTarget.location.y)}§7, §f${Math.round(onlineTarget.location.z)}`;
            dimension = `§e${onlineTarget.dimension.id.replace("minecraft:", "").toUpperCase()}`;
            const p = onlineTarget.getPing();
            if (p !== undefined) {
                let pingColor = "§a"; // Green for excellent
                if (p >= 50 && p < 100) pingColor = "§e"; // Yellow for good
                if (p >= 100 && p < 200) pingColor = "§6"; // Orange for acceptable
                if (p >= 200) pingColor = "§c"; // Red for high latency
                ping = `${pingColor}${p}ms`;
            } else {
                ping = "§7Unknown";
            }
        }

        const dossier = [
            `§r§l§2--- Paradox Dossier: ${onlineTarget?.name ?? query} ---§r`,
            `§r§7Clearance: §fLevel ${clearance}`,
            `§r§7Current Platform:  §f${currentPlatform}`,
            `§r§7First Platform:    §f${metadata?.firstPlatform ?? "Unknown"}`,
            `§r§7First Joined: §f${metadata?.joinDate ?? "N/A"}`,
            `§r§7Last Seen:  §f${formatTimestamp(metadata?.lastSeen)}`,
            `§r§7Dimension: §f${dimension}`,
            `§r§7Position:  ${position}`,
            `§r§7Health:    ${health}`,
            `§r§7Ping:      ${ping}`,
        ];

        // 4. Level 4 Restricted Forensic Data
        if (senderClearance === 4) {
            dossier.push(`§r§b[Forensic Data]`);
            dossier.push(`§r§7Stored ID: §f${targetId}`);
        }

        dossier.push(`§r§2----------------------------------`);

        // Send the report privately to the moderator
        sender.sendMessage(dossier.join("\n"));
    },
};
