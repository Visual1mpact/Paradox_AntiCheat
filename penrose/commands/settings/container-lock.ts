import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { chestLockDB, paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startChestLock, stopChestLock } from "../../modules/container-lock-module";

/**
 * Handles enabling or disabling the chest lock module.
 *
 * @param {Player} player - The command sender executing the action.
 * @param {boolean} enable - True to turn the module on, false to turn off.
 */
async function handleModuleToggle(player: Player, enable: boolean): Promise<void> {
    await paradoxModulesDB.set("chestLock_b", { enabled: enable });
    if (enable) {
        startChestLock();
        player.sendMessage("§2[§7Paradox§2]§o§7 Chest lock module §aenabled§7.");
    } else {
        stopChestLock();
        player.sendMessage("§2[§7Paradox§2]§o§7 Chest lock module §4disabled§7.");
    }
}

/**
 * Clears all locked chest entries and pointers from the database.
 *
 * @param {Player} player - The command sender executing the clear action.
 */
async function handleClearChests(player: Player): Promise<void> {
    const chestCount = chestLockDB.listPointers().length;

    if (chestCount === 0) {
        player.sendMessage("§2[§7Paradox§2]§o§7 There are no locked chests to clear.");
        return;
    }

    for (const key of chestLockDB.listPointers()) {
        await chestLockDB.delete(key);
    }

    await chestLockDB.clear();
    player.sendMessage(`§2[§7Paradox§2]§o§7 Cleared §f${chestCount} §7locked chests from the database.`);
}

/**
 * Grants container access rights to a target player for all containers owned by the sender.
 *
 * @param {Player} player - The container owner granting access.
 * @param {string | undefined} target - Username of the player receiving access.
 */
async function handleShareAccess(player: Player, target?: string): Promise<void> {
    if (target === player.name) {
        player.sendMessage(" §o§c[Paradox] You already have access to your own containers.");
        return;
    }

    if (!target) {
        player.sendMessage("§o§c[Paradox] Specify a player name.");
        return;
    }

    let updated = 0;

    for (const [key, value] of await chestLockDB.entries()) {
        if (value.owner !== player.name) continue;
        if (value.sharedWith?.includes(target)) continue;

        const updatedShared = [...(value.sharedWith ?? []), target];
        await chestLockDB.set(key, { ...value, sharedWith: updatedShared });
        updated++;
    }

    player.sendMessage(`§2[§7Paradox§2]§o§7 Granted §f${target}§7 access to §f${updated}§7 containers.`);
}

/**
 * Revokes container access rights from a target player for all containers owned by the sender.
 *
 * @param {Player} player - The container owner revoking access.
 * @param {string | undefined} target - Username of the player losing access.
 */
async function handleUnshareAccess(player: Player, target?: string): Promise<void> {
    if (target === player.name) {
        player.sendMessage("§o§c[Paradox] You cannot revoke access to your own containers.");
        return;
    }

    if (!target) {
        player.sendMessage("§o§c[Paradox] Specify a player name.");
        return;
    }

    let updated = 0;

    for (const [key, value] of await chestLockDB.entries()) {
        if (value.owner !== player.name) continue;
        if (!value.sharedWith?.includes(target)) continue;

        const filtered = value.sharedWith.filter((p) => p !== target);
        await chestLockDB.set(key, { ...value, sharedWith: filtered });
        updated++;
    }

    player.sendMessage(`§2[§7Paradox§2]§o§7 Revoked §f${target}§7 access from §f${updated}§7 containers.`);
}

/**
 * Lists all players who currently have shared access to containers owned by the sender.
 *
 * @param {Player} player - The container owner requesting the list.
 */
async function handleViewShared(player: Player): Promise<void> {
    const sharedPlayers = new Set<string>();

    for (const [, value] of await chestLockDB.entries()) {
        if (value.owner !== player.name) continue;
        value.sharedWith?.forEach((p) => sharedPlayers.add(p));
    }

    if (!sharedPlayers.size) {
        player.sendMessage("§2[§7Paradox§2]§o§7 No players currently have shared access.");
        return;
    }

    player.sendMessage("§2[§7Paradox§2]§o§7 Players with access:");
    [...sharedPlayers].forEach((p, i) => player.sendMessage(` §8[${i + 1}] §f${p}`));
}

/**
 * Look up forensic ownership and access logs for a specific chest key.
 *
 * @param {Player} player - Command sender receiving output.
 * @param {string} inputArg - Original raw chest identifier argument.
 * @param {string} normalizedArg - Fully qualified chest key used in database lookup.
 * @returns {Promise<boolean>} True if chest was found and details displayed, false otherwise.
 */
async function handleChestLookup(player: Player, inputArg: string, normalizedArg: string): Promise<boolean> {
    const chestData = await chestLockDB.get(normalizedArg);
    if (!chestData) return false;

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

    return true;
}

/**
 * Searches and displays container access logs associated with a target player username.
 *
 * @param {Player} player - Command sender receiving output.
 * @param {string} inputArg - Target player username to query.
 */
async function handlePlayerLookup(player: Player, inputArg: string): Promise<void> {
    const logs: { chest: string; time: number }[] = [];

    for (const [key, value] of await chestLockDB.entries()) {
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
}

/**
 * Chest forensic command:
 * - Lookup chest ownership + logs
 * - Lookup player access logs
 * - Enable/disable chest lock module
 * - Clear all chests from the database
 */
export const chestForensicCommand: Command = {
    name: "chestforensic",
    description: "Displays locked chest info, player logs, toggles chest lock module, or clears chests.",
    usage: "{prefix}chestforensic < chestKey | playerName | on | off | clear > ",
    examples: ["{prefix}chestforensic overworld_0_64_0", "{prefix}chestforensic Player123", "{prefix}chestforensic on", "{prefix}chestforensic off", "{prefix}chestforensic clear"],
    category: "Modules",
    securityClearance: 1,
    icon: "textures/ui/lock_color.png",

    guiInstructions: {
        formType: "ActionFormData",
        title: "Chest Forensics",
        description:
            "§7Manage and investigate locked chests, toggle the chest lock module, or clear all chests.\n\n" +
            "§7• §fLookup Chest§7: View the owner and recent access logs for a specific chest.\n" +
            "§7• §fLookup Online Player§7: View access logs for currently online players.\n" +
            "§7• §fLookup Offline Player§7: Enter any username to search access history (offline supported).\n\n" +
            "§7• §fEnable/Disable Chest Lock§7: Turn the chest lock module on or off (admins only).\n" +
            "§7• §fClear All Chests§7: Delete all locked chest entries from the database (admins only).\n\n" +
            "§7Chest Locking Mechanics:\n" +
            "§7• Use a §fstick§7 on a chest to lock it to yourself.\n" +
            "§7• Use the §fstick§7 again to unlock it (owner or admins only).\n" +
            "§7• Locked chests prevent access and breaking by other players.\n\n" +
            "§7All chest interactions are logged for administrative review.\n",
        commandOrder: "command-arg",

        actions: [
            {
                name: "Lookup Chest",
                description: "View owner and access logs for a chest. Key format: dimension_x_y_z.\n\n",
                icon: "textures/blocks/chest_front.png",
                securityClearance: 4,
                generateModalForm: true,
                requiredFields: ["chestKey"],
            },
            {
                name: "Lookup Online Player",
                description: "View access logs for a currently online player.\n\n",
                icon: "textures/ui/player_online_icon.png",
                securityClearance: 4,
                generateModalForm: true,
                requiredFields: ["playerNameOnline"],
            },
            {
                name: "Lookup Offline Player",
                description: "Manually enter a username to view access logs (offline supported).\n\n",
                icon: "textures/ui/player_offline_icon.png",
                securityClearance: 4,
                generateModalForm: true,
                requiredFields: ["playerNameOffline"],
            },
            {
                name: "Enable Chest Lock Module",
                description: "Turn on the chest lock system.\n\n",
                icon: "textures/ui/icon_lock.png",
                securityClearance: 4,
                command: ["on"],
            },
            {
                name: "Disable Chest Lock Module",
                description: "Turn off the chest lock system.\n\n",
                icon: "textures/ui/icon_unlocked.png",
                securityClearance: 4,
                command: ["off"],
            },
            {
                name: "Clear All Chests",
                description: "Deletes all locked chest entries from the database. Fresh start!\n\n",
                icon: "textures/ui/trash.png",
                securityClearance: 4,
                command: ["clear"],
            },
            {
                name: "Share Containers",
                description: "Allow another player to access all containers you own.\n\n",
                icon: "textures/ui/FriendsIcon.png",
                securityClearance: 1,
                generateSubActions: true,
                subActions: [
                    {
                        name: "Add Online Player",
                        command: ["share"],
                        requiredFields: ["playerNameOnline"],
                        icon: "textures/ui/player_online_icon.png",
                        securityClearance: 1,
                        generateModalForm: true,
                    },
                    {
                        name: "Add Offline Player",
                        command: ["share"],
                        requiredFields: ["playerNameOffline"],
                        icon: "textures/ui/player_offline_icon.png",
                        securityClearance: 1,
                        generateModalForm: true,
                    },
                ],
            },
            {
                name: "Revoke Access",
                description: "Remove a player's access to your containers.\n\n",
                icon: "textures/ui/icon_unlocked.png",
                securityClearance: 1,
                generateSubActions: true,
                subActions: [
                    {
                        name: "Revoke Online Player",
                        requiredFields: ["playerNameOnline"],
                        icon: "textures/ui/player_online_icon.png",
                        command: ["unshare"],
                        securityClearance: 1,
                        generateModalForm: true,
                    },
                    {
                        name: "Revoke Offline Player",
                        requiredFields: ["playerNameOffline"],
                        icon: "textures/ui/player_offline_icon.png",
                        command: ["unshare"],
                        securityClearance: 1,
                        generateModalForm: true,
                    },
                ],
            },

            {
                name: "View Shared Players",
                description: "View who can access your containers.\n\n",
                icon: "textures/ui/magnifyingGlass.png",
                securityClearance: 1,
                command: ["shared"],
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
     * @param {ChatSendBeforeEvent | undefined} message - The message object context.
     * @param {string[]} args - The command argument list.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;

        const player = message.sender;
        const currentPrefix = (world.getDynamicProperty("__prefix") as string) || ":";
        const inputArg = args[0]?.trim();

        if (!inputArg) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: §f${currentPrefix}chestforensic < chestKey | playerName | on | off | clear >`);
            return;
        }

        const action = inputArg.toLowerCase();

        if (action === "on") {
            await handleModuleToggle(player, true);
            return;
        }

        if (action === "off") {
            await handleModuleToggle(player, false);
            return;
        }

        if (action === "clear") {
            await handleClearChests(player);
            return;
        }

        if (action === "share") {
            await handleShareAccess(player, args[1]);
            return;
        }

        if (action === "unshare") {
            await handleUnshareAccess(player, args[1]);
            return;
        }

        if (action === "shared") {
            await handleViewShared(player);
            return;
        }

        const isChestKeyFormat = /^[a-zA-Z]+_-?\d+_-?\d+_-?\d+$/.test(inputArg);
        const normalizedArg = isChestKeyFormat ? `minecraft:${inputArg}` : inputArg;

        const foundChest = await handleChestLookup(player, inputArg, normalizedArg);
        if (foundChest) return;

        await handlePlayerLookup(player, inputArg);
    },
};
