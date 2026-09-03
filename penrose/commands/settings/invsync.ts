import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startInvSync, stopInvSync, forceCheckAll, clearAllAuditLogs, getInventoryState } from "../../modules/invsync-module";
import { paradoxModulesDB, invSyncAuditDB } from "../../event-listeners/world-initialize";

interface ModuleData {
    enabled?: boolean;
}

interface AnomalyEvent {
    time: number;
    excessItems: Record<string, number>;
    totalExcess: number;
}

interface AuditRecord {
    events: AnomalyEvent[];
}

/**
 * Toggles the InvSync module operational state and sends feedback.
 * @param {Player} player - The issuing player.
 * @param {ModuleData} moduleData - Current database record for the module.
 * @returns {Promise<void>}
 */
async function handleToggle(player: Player, moduleData: ModuleData): Promise<void> {
    const isCurrentlyEnabled = moduleData.enabled ?? false;
    const nextState = !isCurrentlyEnabled;

    moduleData.enabled = nextState;
    await paradoxModulesDB.set("invSync_b", { ...moduleData, enabled: nextState });

    if (nextState) {
        startInvSync();
        player.sendMessage("§2[§7Paradox§2]§o§7 InvSync has been §aenabled§7.");
    } else {
        stopInvSync();
        player.sendMessage("§2[§7Paradox§2]§o§7 InvSync has been §4disabled§7.");
    }
}

/**
 * Renders suspicious item alerts for quantities over normal stack limits.
 * @param {Player} player - Recipient player.
 * @param {Record<string, number>} counts - Inventory item counts map.
 */
function renderSuspiciousItems(player: Player, counts: Record<string, number>): void {
    const suspiciousItems = Object.entries(counts)
        .filter(([_, amount]) => amount > 64)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (!suspiciousItems.length) return;

    player.sendMessage("§2[§7Paradox§2]§o§7 §6Top Suspicious Items:");
    suspiciousItems.forEach(([itemId, amount]) => {
        const itemName = itemId.replace("minecraft:", "");
        player.sendMessage(`  §o§7| §2${itemName} §7x§c${amount}`);
    });
}

/**
 * Renders the full aggregated inventory count list.
 * @param {Player} player - Recipient player.
 * @param {Record<string, number>} counts - Inventory item counts map.
 */
function renderInventoryCounts(player: Player, counts: Record<string, number>): void {
    player.sendMessage("§2[§7Paradox§2]§o§7 Full Inventory Counts:");
    Object.entries(counts).forEach(([itemId, amount], index) => {
        const slotLabel = `§2[§fSlot ${index}§2]`;
        const itemName = `§2[§f${itemId.replace("minecraft:", "")}§2]`;
        const anomalyHighlight = amount > 64 ? " §c(!)" : "";

        player.sendMessage(`  §o§7| ${slotLabel} §2=>§f ${itemName} §7Amount: §2${amount}${anomalyHighlight}`);
    });
}

/**
 * Formats and renders recent audit event entries.
 * @param {Player} player - Recipient player.
 * @param {AnomalyEvent[]} events - Audit event records array.
 */
function renderAuditEvents(player: Player, events: AnomalyEvent[]): void {
    const recentEvents = events.slice(-10);

    if (!recentEvents.length) {
        player.sendMessage("§2[§7Paradox§2]§o§7 No anomalies detected.");
        return;
    }

    player.sendMessage("§2[§7Paradox§2]§o§7 Recent Anomalies:");
    recentEvents.forEach((e, i) => {
        const items = Object.entries(e.excessItems)
            .map(([id]) => {
                const clean = id.replace("minecraft:", "").replace(/_/g, " ");
                return clean.charAt(0).toUpperCase() + clean.slice(1);
            })
            .join(", ");

        player.sendMessage(`  §8[${i + 1}] §fTime: ${new Date(e.time).toLocaleString()} §7Excess: §2[§7${items}§2]§o§7§f, §cTotal: ${e.totalExcess}`);
    });
}

/**
 * Handles generating and displaying the forensic audit output.
 * @param {Player} player - The issuing player.
 * @param {string | undefined} targetName - The targeted target player name.
 * @param {string} prefix - Command prefix string.
 * @returns {Promise<void>}
 */
async function handleForensic(player: Player, targetName: string | undefined, prefix: string): Promise<void> {
    if (!targetName) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 §cUsage: ${prefix}invsync forensic <player>`);
        return;
    }

    const targetPlayer = world.getPlayers().find((p) => p.name.toLowerCase() === targetName.toLowerCase());
    if (!targetPlayer) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 §cPlayer §f${targetName} §cis not online.`);
        return;
    }

    const currentState = getInventoryState(targetPlayer);
    if (!currentState) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 §cUnable to fetch inventory for §f${targetPlayer.name}`);
        return;
    }

    const audit = ((await invSyncAuditDB.get(targetPlayer.id)) as AuditRecord | undefined) ?? { events: [] };

    player.sendMessage(`§2[§7Paradox§2]§o§7 §2[InvSync Forensics] §7Player: §f${targetPlayer.name}`);

    renderSuspiciousItems(player, currentState.counts);
    renderInventoryCounts(player, currentState.counts);
    renderAuditEvents(player, audit.events);
}

/**
 * Processes module action subcommands (status, check, clear).
 * @param {Player} player - Player object.
 * @param {string} sub - Subcommand text identifier.
 * @param {boolean} enabled - Operational flag status.
 * @returns {Promise<boolean>} Handled status boolean flag.
 */
async function handleModuleSubactions(player: Player, sub: string, enabled: boolean): Promise<boolean> {
    if (sub === "status") {
        player.sendMessage(`§2[§7Paradox§2]§o§7 InvSync is currently ${enabled ? "§aenabled" : "§4disabled"}§7.`);
        return true;
    }

    if (sub === "check") {
        if (!enabled) player.sendMessage("§2[§7Paradox§2]§o§7 §cInvSync must be enabled first.");
        else {
            await forceCheckAll();
            player.sendMessage("§2[§7Paradox§2]§o§7 §a[§7InvSync§a]§7 Recheck forced for all online players.");
        }
        return true;
    }

    if (sub === "clear") {
        await clearAllAuditLogs();
        player.sendMessage("§2[§7Paradox§2]§o§7 §a[§7InvSync§a]§7 All stored audit history cleared.");
        return true;
    }

    return false;
}

/**
 * InvSync command controller.
 * Required clearance: Level 4
 */
export const invSyncCommand: Command = {
    name: "invsync",
    description: "Controls the Inventory Synchronization module and provides forensic insights.",
    usage: "{prefix}invsync [ help | status | check | clear | forensic <player> ]",
    examples: ["{prefix}invsync", "{prefix}invsync status", "{prefix}invsync check", "{prefix}invsync clear", "{prefix}invsync forensic Steve"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/switch_accounts.png",

    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Sync Settings",
        description:
            "Manage the Inventory Synchronization (InvSync) module to prevent duplication exploits and investigate anomalies.\n\n" +
            "§7• §fEnable / Disable Module§7: Toggle InvSync to start or stop inventory tracking.\n" +
            "§7• §fForce Recheck§7: Immediately run anomaly detection across all players.\n" +
            "§7• §fClear Audit Logs§7: Remove all stored audit history.\n" +
            "§7• §fStatus§7: Display whether InvSync is currently enabled or disabled.\n" +
            "§7• §fForensic Report§7: View detailed live inventory and anomaly history for a specific player.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Enable / Disable", icon: "textures/ui/toggle_on.png", description: "Toggle the InvSync module on or off." },
            { name: "Force Recheck", icon: "textures/ui/refresh.png", command: ["check"], description: "Immediately run anomaly detection across all players." },
            { name: "Clear Audit Logs", icon: "textures/ui/icon_trash.png", command: ["clear"], description: "Remove all stored audit history." },
            { name: "Status", icon: "textures/ui/check.png", command: ["status"], description: "Display whether InvSync is currently enabled or disabled." },
            { name: "Forensic: View Player", icon: "textures/ui/dressing_room_skins.png", requiredFields: ["playerName"], command: ["forensic"], description: "View detailed inventory and anomaly history for a specific player." },
        ],
        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const moduleData = ((await paradoxModulesDB.get("invSync_b")) as ModuleData | undefined) ?? { enabled: false };
        const enabled = moduleData.enabled ?? false;

        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        const sub = args[0]?.toLowerCase();

        if (!sub) {
            await handleToggle(player, moduleData);
            return;
        }

        const isHandled = await handleModuleSubactions(player, sub, enabled);
        if (isHandled) return;

        if (sub === "forensic") {
            await handleForensic(player, args[1], prefix);
            return;
        }

        player.sendMessage(`§2[§7Paradox§2]§o§7 §cUnknown subcommand. Use §f${prefix}invsync help`);
    },
};
