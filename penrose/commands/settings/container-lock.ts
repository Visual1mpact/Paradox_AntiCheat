import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { chestLockDB } from "../../event-listeners/world-initialize";
import { startChestLock, stopChestLock } from "../../modules/container-lock";

/**
 * Chest forensic command:
 * - Lookup chest ownership + logs
 * - Lookup player access logs
 * - Enable/disable chest lock module
 */
export const chestForensicCommand: Command = {
    name: "chestforensic",
    description: "Displays locked chest info, player logs, or toggles chest lock module.",
    usage: "{prefix}chestforensic < chestKey | playerName | on | off > ",
    examples: ["{prefix}chestforensic overworld_0_64_0", "{prefix}chestforensic Player123", "{prefix}chestforensic on", "{prefix}chestforensic off"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/lock_color.png",

    guiInstructions: {
        formType: "ActionFormData",
        title: "Chest Forensics",
        description:
            "Manage and investigate locked chests.\n\n" +
            "§7• §fLookup Chest§7: View the owner and recent access logs for a specific chest.\n" +
            "§7• §fLookup Online Player§7: See which locked chests a currently online player has accessed.\n" +
            "§7• §fLookup Offline Player§7: Manually enter any username to search their access history.\n\n" +
            "§7Chest Locking:\n" +
            "§7• Use a §fstick§7 on a chest to lock it to yourself.\n" +
            "§7• Use a §fstick§7 again to unlock it (owner or admins only).\n" +
            "§7• Locked chests prevent access and breaking by other players.\n\n" +
            "§7All interactions are logged for administrative review.\n\n",
        commandOrder: "command-arg",

        actions: [
            {
                name: "Lookup Chest",
                description: "View owner and access logs for a chest. Key format: dimension_x_y_z.",
                icon: "textures/blocks/chest_front.png",
                generateModalForm: true,
                requiredFields: ["chestKey"],
            },
            {
                name: "Lookup Online Player",
                description: "View access logs for a currently online player.",
                icon: "textures/ui/player_online_icon.png",
                generateModalForm: true,
                requiredFields: ["playerNameOnline"],
            },
            {
                name: "Lookup Offline Player",
                description: "Manually enter a username to view access logs (offline supported).",
                icon: "textures/ui/player_offline_icon.png",
                generateModalForm: true,
                requiredFields: ["playerNameOffline"],
            },
            {
                name: "Enable Chest Lock Module",
                description: "Turn on the chest lock system.",
                icon: "textures/ui/icon_lock.png",
                command: ["on"],
            },
            {
                name: "Disable Chest Lock Module",
                description: "Turn off the chest lock system.",
                icon: "textures/ui/icon_unlocked.png",
                command: ["off"],
            },
        ],

        dynamicFields: [
            {
                name: "\nSelect Chest:",
                type: "dropdown",
                sourceType: "chests",
                placeholder: "Choose a chest",
                requiredFields: ["chestKey"],
            },
            {
                name: "\nSelect Online Player:",
                type: "dropdown",
                sourceType: "players",
                placeholder: "Choose a player",
                requiredFields: ["playerNameOnline"],
            },
            {
                name: "\nEnter Player Name:",
                type: "text",
                placeholder: "Enter any username",
                requiredFields: ["playerNameOffline"],
            },
        ],
    },

    /**
     * Executes the chestforensic command.
     *
     * @param message - Chat event containing the player who ran the command.
     * @param args - Command arguments:
     *  [0] = chest key | player name | "on" | "off"
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        const player = message.sender;
        const currentPrefix = world.getDynamicProperty("__prefix") as string;
        const inputArg = args[0]?.trim();

        const isChestKeyFormat = /^[a-zA-Z]+_-?\d+_-?\d+_-?\d+$/.test(inputArg);

        let normalizedArg = inputArg;
        if (isChestKeyFormat) {
            normalizedArg = `minecraft:${inputArg}`;
        }

        if (!inputArg) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: §f${currentPrefix}chestforensic < chestKey | playerName | on | off >`);
            return;
        }

        // Toggle module
        if (inputArg.toLowerCase() === "on") {
            startChestLock();
            player.sendMessage("§2[§7Paradox§2]§o§7 Chest lock module §aenabled§7.");
            return;
        }

        if (inputArg.toLowerCase() === "off") {
            stopChestLock();
            player.sendMessage("§2[§7Paradox§2]§o§7 Chest lock module §cdisabled§7.");
            return;
        }

        // Chest lookup
        const chestData = chestLockDB.get(normalizedArg);
        if (chestData) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Chest Forensics for §f${inputArg}`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Owner: §f${chestData.owner ?? "Unknown"}`);

            if (chestData.lastAccessed) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Last Accessed: §f${new Date(chestData.lastAccessed).toLocaleString()}`);
            }

            if (chestData.accessLog?.length) {
                player.sendMessage("§2[§7Paradox§2]§o§7 Access Log (last 10 events):");
                chestData.accessLog.slice(-10).forEach((entry, i) => {
                    player.sendMessage(`  §8[${i + 1}] §fPlayer: ${entry.player} §7Time: §f${new Date(entry.time).toLocaleString()}`);
                });
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 No access events recorded for this chest.");
            }

            return;
        }

        // Player lookup
        const logs: { chest: string; time: number }[] = [];

        for (const [key, value] of chestLockDB.entries()) {
            value.accessLog?.forEach((entry) => {
                if (entry.player === inputArg) {
                    logs.push({ chest: key as string, time: entry.time });
                }
            });
        }

        if (!logs.length) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 No chest found or access logs for §f${inputArg}`);
            return;
        }

        player.sendMessage(`§2[§7Paradox§2]§o§7 Access Logs for player §f${inputArg}:`);
        logs.slice(-10).forEach((entry, i) => {
            player.sendMessage(`  §8[${i + 1}] §7Chest: §f${entry.chest} §7Time: §f${new Date(entry.time).toLocaleString()}`);
        });
    },
};
