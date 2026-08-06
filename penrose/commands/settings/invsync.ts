import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startInvSync, stopInvSync, forceSnapshotAll, forceCheckAll, clearAllSnapshots } from "../../modules/invsync";
import { paradoxModulesDB, invSyncSnapshotsDB, invSyncAuditDB } from "../../event-listeners/world-initialize";

/**
 * InvSync command controller.
 *
 * Provides administrative control over the Inventory Synchronization module
 * and exposes forensic reporting tools for anomaly investigation.
 *
 * Required clearance: Level 4
 */
export const invSyncCommand: Command = {
    name: "invsync",
    description: "Controls the Inventory Synchronization module and provides forensic insights.",
    usage: "{prefix}invsync [ help | status | snapshot | check | clear | forensic <player> ]",
    examples: ["{prefix}invsync", "{prefix}invsync status", "{prefix}invsync snapshot", "{prefix}invsync check", "{prefix}invsync clear", "{prefix}invsync forensic Steve"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/switch_accounts.png",

    /**
     * GUI configuration used by the command framework
     * to generate the module settings interface.
     */
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Sync Settings",
        description:
            "Manage the Inventory Synchronization (InvSync) module to prevent duplication exploits and investigate anomalies.\n\n" +
            "§7• §fEnable / Disable Module§7: Toggle InvSync to start or stop inventory tracking.\n" +
            "§7• §fForce Snapshot§7: Capture the current inventory state of all online players.\n" +
            "§7• §fForce Recheck§7: Immediately run anomaly detection across all players.\n" +
            "§7• §fClear Snapshots§7: Remove all stored inventory snapshots and audit history.\n" +
            "§7• §fStatus§7: Display whether InvSync is currently enabled or disabled.\n" +
            "§7• §fForensic Report§7: View detailed inventory and anomaly history for a specific player.\n\n" +
            "§7InvSync Rules:\n" +
            "§7• Always enable InvSync to track player inventories properly.\n" +
            "§7• Forensic reports highlight items exceeding normal stack sizes (§c>64§7).\n" +
            "§7• Only administrators with clearance level 4 can modify or access forensic tools.\n\n" +
            "§7All interactions are logged for administrative review.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Enable / Disable", icon: "textures/ui/toggle_on.png", description: "Toggle the InvSync module on or off." },
            { name: "Force Snapshot", icon: "textures/ui/icon_import.png", command: ["snapshot"], description: "Capture the current inventory state of all online players." },
            { name: "Force Recheck", icon: "textures/ui/refresh.png", command: ["check"], description: "Immediately run anomaly detection across all players." },
            { name: "Clear Snapshots", icon: "textures/ui/icon_trash.png", command: ["clear"], description: "Remove all stored inventory snapshots and audit history." },
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

    /**
     * Command execution entry point.
     * Routes subcommands and enforces module state requirements where applicable.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const key = "invSync_b";
        const moduleData = (await paradoxModulesDB.get(key)) ?? { enabled: false };
        const enabled = moduleData.enabled ?? false;

        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        const sub = args[0]?.toLowerCase();

        // Toggle module when no subcommand is provided.
        if (!sub) {
            moduleData.enabled = !enabled;
            await paradoxModulesDB.set(key, moduleData);

            if (!enabled) {
                moduleData.enabled = true;
                await paradoxModulesDB.set("invSync_b", moduleData);
                startInvSync();
                player.sendMessage("§2[§7Paradox§2]§o§7 InvSync has been §aenabled§7.");
            } else {
                moduleData.enabled = false;
                await paradoxModulesDB.set("invSync_b", moduleData);
                stopInvSync();
                player.sendMessage("§2[§7Paradox§2]§o§7 InvSync has been §4disabled§7.");
            }
            return;
        }

        // Display current module state.
        if (sub === "status") {
            player.sendMessage(`§2[§7Paradox§2]§o§7 InvSync is currently ${enabled ? "§aenabled" : "§4disabled"}§7.`);
            return;
        }

        // Force snapshot of all online players.
        if (sub === "snapshot") {
            if (!enabled) return player.sendMessage("§2[§7Paradox§2]§o§7 §c§oInvSync must be enabled first.");

            await forceSnapshotAll();
            player.sendMessage("§2[§7Paradox§2]§o§7 §a[§7InvSync§a]§7 Snapshot forced for all online players.");
            return;
        }

        // Force immediate anomaly check for all online players.
        if (sub === "check") {
            if (!enabled) return player.sendMessage("§2[§7Paradox§2]§o§7 §cInvSync must be enabled first.");

            await forceCheckAll();
            player.sendMessage("§2[§7Paradox§2]§o§7 §a[§7InvSync§a]§7 Rejoin check forced for all online players.");
            return;
        }

        // Clear all stored snapshots and audit history.
        if (sub === "clear") {
            await clearAllSnapshots();
            player.sendMessage("§2[§7Paradox§2]§o§7 §§a[§7InvSync§a]§7 All stored snapshots cleared.");
            return;
        }

        /**
         * Forensic report:
         * Displays stored snapshot data and recent anomaly history
         * for a specified player.
         */
        if (sub === "forensic") {
            const targetName = args[1];

            if (!targetName) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 §cUsage: ${prefix}invsync forensic <player>`);
                return;
            }

            // Locate snapshot by case-insensitive name match.
            const snapshotEntry = [...(await invSyncSnapshotsDB.entries())].find(([_, snapshot]) => snapshot.name.toLowerCase() === targetName.toLowerCase());

            if (!snapshotEntry) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 §cNo snapshot found for player §f${targetName}`);
                return;
            }

            const [targetId, snapshot] = snapshotEntry;
            const audit = (await invSyncAuditDB.get(targetId)) ?? { events: [] };

            // Header information
            player.sendMessage(`§2[§7Paradox§2]§o§7 §2[InvSync Forensics] §7Player: §f${snapshot.name}`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Last Snapshot: §f${new Date(snapshot.time).toLocaleString()}`);

            // Highlight items exceeding standard stack size (64).
            const suspiciousItems = Object.entries(snapshot.counts)
                .filter(([_, amount]) => amount > 64)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            if (suspiciousItems.length) {
                player.sendMessage("§2[§7Paradox§2]§o§7 §6Top Suspicious Items:");
                suspiciousItems.forEach(([itemId, amount]) => {
                    const itemName = itemId.replace("minecraft:", "");
                    player.sendMessage(`  §o§7| §2${itemName} §7x§c${amount}`);
                });
            }

            // Full stored inventory snapshot (aggregated counts).
            player.sendMessage("§2[§7Paradox§2]§o§7 Full Inventory Counts:");

            Object.entries(snapshot.counts).forEach(([itemId, amount], index) => {
                const slotLabel = `§2[§fSlot ${index}§2]`;
                const itemName = `§2[§f${itemId.replace("minecraft:", "")}§2]`;
                const anomalyHighlight = amount > 64 ? " §c(!)" : "";

                player.sendMessage(`  §o§7| ${slotLabel} §2=>§f ${itemName} §7Amount: §2${amount}${anomalyHighlight}`);
            });

            // Display last 10 recorded anomaly events.
            const recentEvents = audit.events.slice(-10);

            if (recentEvents.length) {
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
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 No anomalies detected.");
            }

            return;
        }

        // Fallback for unknown subcommands.
        player.sendMessage(`§2[§7Paradox§2]§o§7 §cUnknown subcommand. Use §f${prefix}invsync help`);
    },
};
