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
        description: "Manage the InvSync module to prevent rejoin-based duplication exploits and investigate anomalies.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Enable / Disable", icon: "textures/ui/toggle_on.png" },
            { name: "Force Snapshot", icon: "textures/ui/icon_import.png", command: ["snapshot"] },
            { name: "Force Recheck", icon: "textures/ui/refresh.png", command: ["check"] },
            { name: "Clear Snapshots", icon: "textures/ui/icon_trash.png", command: ["clear"] },
            { name: "Status", icon: "textures/ui/check.png", command: ["status"] },
            { name: "Forensic: View Player", icon: "textures/ui/dressing_room_skins.png", requiredFields: ["playerName"], command: ["forensic"] },
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
        const moduleData = paradoxModulesDB.get(key) ?? { enabled: false };
        const enabled = moduleData.enabled ?? false;

        const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
        const sub = args[0]?.toLowerCase();

        // Toggle module when no subcommand is provided.
        if (!sub) {
            moduleData.enabled = !enabled;
            await paradoxModulesDB.set(key, moduleData);

            if (!enabled) {
                startInvSync();
                player.sendMessage("§2[§7Paradox§2]§o§7 InvSync has been §aenabled§7.");
            } else {
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
            const snapshotEntry = [...invSyncSnapshotsDB.entries()].find(([_, snapshot]) => snapshot.name.toLowerCase() === targetName.toLowerCase());

            if (!snapshotEntry) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 §cNo snapshot found for player §f${targetName}`);
                return;
            }

            const [targetId, snapshot] = snapshotEntry;
            const audit = invSyncAuditDB.get(targetId) ?? { events: [] };

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
