import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { playerMetadataDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

interface Metadata {
    firstPlatform?: string;
    joinDate?: string;
    lastSeen?: number;
}

interface TargetInfo {
    targetId: string;
    onlineTarget?: Player | undefined;
    metadata?: Metadata | undefined;
}

interface TargetStats {
    health: string;
    position: string;
    dimension: string;
    ping: string;
}

/**
 * Resolves player identity ID from cache or database lookup.
 * @param {string} query - Target search string.
 * @returns {Promise<string | undefined>} Resolved player ID string or undefined.
 */
async function resolveTargetId(query: string): Promise<string | undefined> {
    const onlineByName = PlayerCache.getPlayerByName(query);
    if (onlineByName) return onlineByName.id;

    const storedMetadata = await playerMetadataDB.get(query);
    return storedMetadata ? query : undefined;
}

/**
 * Finds active online player entity associated with a target ID or alias.
 * @param {string} targetId - Unique player ID.
 * @param {string} query - Original search query term.
 * @returns {Player | undefined} Matched online player instance.
 */
function resolveOnlineTarget(targetId: string, query: string): Player | undefined {
    return PlayerCache.getPlayerById(targetId) || [...PlayerCache.getPlayers()].find((p) => p.getDynamicProperty("paradoxAlias")?.toString().toLowerCase() === query.toLowerCase());
}

/**
 * Formats unix timestamp into standard locale display string.
 * @param {number | undefined} timestamp - Target millisecond timestamp.
 * @returns {string} Formatted timestamp string or N/A.
 */
function formatTimestamp(timestamp?: number): string {
    if (timestamp === undefined) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Formats health values and progress bar.
 * @param {Player} target - Active online player entity.
 * @returns {string} Formatted health string.
 */
function formatHealth(target: Player): string {
    const healthComp = target.getComponent("minecraft:health");
    if (!healthComp) return "N/A";

    const current = Math.round(healthComp.currentValue);
    const max = Math.round(healthComp.effectiveMax);
    const percent = current / max;
    const bars = 10;
    const filled = Math.floor(percent * bars);
    const healthBar = ` §8[§2${"|".repeat(filled)}§7${"|".repeat(bars - filled)}§8]`;

    return `§a${current}§7/§2${max}${healthBar}`;
}

/**
 * Formats ping status with color coding based on latency thresholds.
 * @param {Player} target - Active online player entity.
 * @returns {string} Colorized ping string.
 */
function formatPing(target: Player): string {
    const p = target.getPing();
    if (p === undefined) return "§7Unknown";

    let pingColor = "§a";
    if (p >= 50 && p < 100) pingColor = "§e";
    else if (p >= 100 && p < 200) pingColor = "§6";
    else if (p >= 200) pingColor = "§c";

    return `${pingColor}${p}ms`;
}

/**
 * Retrieves player location and dimension details.
 * @param {Player} target - Active online player entity.
 * @returns {{ position: string, dimension: string }} Formatted coordinates and dimension name.
 */
function formatLocation(target: Player): { position: string; dimension: string } {
    const targetTransform = PlayerLocationCache.getTransform(target);
    const targetLoc = targetTransform?.location ?? target.location;
    const targetDim = targetTransform?.dimension ?? target.dimension;

    return {
        position: `§f${Math.round(targetLoc.x)}§7, §f${Math.round(targetLoc.y)}§7, §f${Math.round(targetLoc.z)}`,
        dimension: `§e${targetDim.id.replace("minecraft:", "").toUpperCase()}`,
    };
}

/**
 * Compiles dynamic statistics for active online targets.
 * @param {Player | undefined} onlineTarget - Active online player entity.
 * @returns {TargetStats} Compiled stat strings.
 */
function getTargetStats(onlineTarget?: Player): TargetStats {
    if (!onlineTarget) {
        return { health: "N/A", position: "N/A", dimension: "N/A", ping: "N/A" };
    }

    const { position, dimension } = formatLocation(onlineTarget);
    return {
        health: formatHealth(onlineTarget),
        position,
        dimension,
        ping: formatPing(onlineTarget),
    };
}

/**
 * Assembles dossier text lines array for reporting output.
 * @param {Player} sender - Invoking player entity.
 * @param {string} query - Raw query text.
 * @param {TargetInfo} info - Target resolving metadata structure.
 * @param {TargetStats} stats - Active targets statistics structure.
 * @returns {string[]} Formatted dossier text lines.
 */
function buildDossier(sender: Player, query: string, info: TargetInfo, stats: TargetStats): string[] {
    const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 1;
    const clearance = info.onlineTarget ? ((info.onlineTarget.getDynamicProperty("securityClearance") as number) ?? 1) : "Offline";
    const currentPlatform = info.onlineTarget ? (info.onlineTarget.clientSystemInfo.platformType ?? "Unknown") : "N/A";

    const dossier = [
        `§r§l§2--- Paradox Dossier: ${info.onlineTarget?.name ?? query} ---§r`,
        `§r§7Clearance: §fLevel ${clearance}`,
        `§r§7Current Platform:  §f${currentPlatform}`,
        `§r§7First Platform:    §f${info.metadata?.firstPlatform ?? "Unknown"}`,
        `§r§7First Joined: §f${info.metadata?.joinDate ?? "N/A"}`,
        `§r§7Last Seen:  §f${formatTimestamp(info.metadata?.lastSeen)}`,
        `§r§7Dimension: §f${stats.dimension}`,
        `§r§7Position:  ${stats.position}`,
        `§r§7Health:    ${stats.health}`,
        `§r§7Ping:      ${stats.ping}`,
    ];

    if (senderClearance === 4) {
        dossier.push(`§r§b[Forensic Data]`);
        dossier.push(`§r§7Stored ID: §f${info.targetId}`);
    }

    dossier.push(`§r§2----------------------------------`);
    return dossier;
}

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

    execute: async (message?: ChatSendBeforeEvent, args?: string[]): Promise<void> => {
        if (!message || !args) return;

        const sender = message.sender;
        const query = args.join(" ").trim().replace(/["@]/g, "");

        if (!query) {
            sender.sendMessage("§o§c[Paradox] Please provide a player name or ID.");
            return;
        }

        const targetId = await resolveTargetId(query);
        if (!targetId) {
            sender.sendMessage(`§o§c[Paradox] No player or identity record found for "${query}".`);
            return;
        }

        const onlineTarget = resolveOnlineTarget(targetId, query);
        const metadata = await playerMetadataDB.get(targetId);
        const stats = getTargetStats(onlineTarget);

        const dossier = buildDossier(sender, query, { targetId, onlineTarget, metadata }, stats);
        sender.sendMessage(dossier.join("\n"));
    },
};
