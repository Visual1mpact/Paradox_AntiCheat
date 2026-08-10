import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, Vector3, world } from "@minecraft/server";
import * as CryptoESImport from "../../node_modules/crypto-es";
import { homesDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../../classes/player-cache";

const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

const DEFAULT_MAX_HOMES = 5;

/**
 * Helper to fetch the applicable maximum home count for a specific player ID.
 * Hierarchy: Per-Player DB Override -> World Dynamic Property -> Default (5)
 */
async function getMaxHomesForPlayer(playerId: string): Promise<number> {
    const dbEntry = await homesDB.get(playerId);
    if (dbEntry?.maxHomes !== undefined && dbEntry.maxHomes > 0) {
        return dbEntry.maxHomes;
    }
    const globalMax = world.getDynamicProperty("globalMaxHomes") as number | undefined;
    if (globalMax !== undefined && globalMax > 0) {
        return globalMax;
    }
    return DEFAULT_MAX_HOMES;
}

/**
 * Represents the home command.
 */
export const homeCommand: Command = {
    name: "home",
    description: "Manage personal home locations with encryption support and configurable home limits.",
    usage: "{prefix}home <set | delete | rename | teleport | list | help> [ homeName ] | {prefix}home [ -t | --target <player> | -g | --global ] [ -l | --limit <amount> ] [ --reset-limit ]",
    examples: [
        `{prefix}home set MyHome`,
        `{prefix}home delete MyHome`,
        `{prefix}home rename MyHome --to NewHome`,
        `{prefix}home teleport MyHome`,
        `{prefix}home list`,
        `{prefix}home -g -l 10`,
        `{prefix}home -g --reset-limit`,
        `{prefix}home -t PlayerName -l 8`,
        `{prefix}home -t PlayerName --reset-limit`,
        `{prefix}home help`,
    ],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/store_home_icon.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Home Management",
        description:
            "Securely manage personal home points for quick travel across dimensions.\n\n" +
            "§7Management:\n" +
            "§7• Save unique locations with custom names.\n" +
            "§7• Teleport instantly to any saved home point.\n" +
            "§7• All location data is encrypted for your security.\n\n" +
            "§7Admin Management:\n" +
            "§7• Change home limits globally or for specific target players (level 4 clearance).\n\n" +
            "§7Restrictions:\n" +
            "§7• Access is restricted while serving a prison sentence.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Set Home", icon: "textures/ui/store_home_icon.png", command: ["set"], description: "Set a new home location", requiredFields: ["homeNameText"], crypto: true, generateModalForm: true },
            { name: "Delete Home", icon: "textures/ui/icon_trash.png", command: ["delete"], description: "Delete an existing home location", requiredFields: ["homeNameDropdown"], crypto: true, generateModalForm: true },
            { name: "Rename Home", icon: "textures/ui/sidebar_icons/realms.png", command: ["rename"], description: "Rename an existing home location", requiredFields: ["homeNameDropdown", "newNameText"], crypto: true, generateModalForm: true },
            { name: "Teleport to Home", icon: "textures/ui/NetherPortalMirror.png", command: ["teleport"], description: "Teleport to a saved home location", requiredFields: ["homeNameDropdown"], crypto: true, generateModalForm: true },
            { name: "List Homes", icon: "textures/ui/icon_map.png", command: ["list"], description: "List all saved home locations", requiredFields: [], crypto: true },
            {
                name: "Set Global Home Limit",
                icon: "textures/ui/world_glyph.png",
                description: "Set max home limit globally for everyone (admin only).",
                securityClearance: 4,
                command: ["-g"],
                requiredFields: ["HomeLimit"],
                generateModalForm: true,
            },
            {
                name: "Reset Global Home Limit",
                icon: "textures/ui/backup_replace.png",
                description: "Reset global home limit back to default (admin only).",
                securityClearance: 4,
                command: ["-g", "--reset-limit"],
                generateModalForm: false,
            },
            {
                name: "Set Player Home Limit",
                icon: "textures/ui/editIcon.png",
                description: "Set max home limit override for a target player (admin only).",
                securityClearance: 4,
                requiredFields: ["TargetPlayer", "HomeLimit"],
                generateModalForm: true,
            },
            {
                name: "Reset Player Home Limit",
                icon: "textures/ui/backup_replace.png",
                description: "Reset player home limit override (admin only).",
                securityClearance: 4,
                command: ["--reset-limit"],
                requiredFields: ["TargetPlayer"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            { name: "\nName of Home:", type: "text", placeholder: "Enter Home Name", requiredFields: ["homeNameText"] },
            { name: "\nRename To:", type: "text", arg: "--to", placeholder: "Enter New Name", requiredFields: ["newNameText"] },
            {
                name: "\nSelect Home:",
                type: "dropdown",
                sourceType: "playerHomes",
                arg: "",
                requiredFields: ["homeNameDropdown"],
            },
            {
                type: "dropdown",
                sourceType: "players",
                name: "\nSelect Target Player:",
                arg: "--target",
                requiredFields: ["TargetPlayer"],
            },
            {
                type: "text",
                name: "\nInput Home Limit:",
                placeholder: "Limit (e.g. 10)",
                arg: "--limit",
                requiredFields: ["HomeLimit"],
            },
        ],
    },

    /**
     * Executes the home command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {typeof CryptoES} cryptoParam - The CryptoES namespace for encryption/decryption.
     */
    execute: async (message?: ChatSendBeforeEvent, args?: string[], cryptoParam?: typeof CryptoES): Promise<void> => {
        if (!message || !message.sender) return;
        const player = message.sender;
        args = args ?? [];
        const cryptoES = (cryptoParam ?? CryptoES) as typeof CryptoES;

        const senderClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        // Flags handling for global or player limit adjustments
        if (args.includes("-t") || args.includes("--target") || args.includes("-g") || args.includes("--global") || args.includes("-l") || args.includes("--limit") || args.includes("--reset-limit")) {
            if (senderClearance < 4) {
                player.sendMessage(`§o§c[Paradox] You do not have permission to modify home limits.`);
                return;
            }

            let targetName = "";
            let isGlobal = false;
            let limitVal: number | undefined;
            let resetLimit = false;

            const validFlags = new Set(["-t", "--target", "-g", "--global", "-l", "--limit", "--reset-limit"]);

            const argsCopy = [...args];
            while (argsCopy.length > 0) {
                const flag = argsCopy.shift();
                switch (flag) {
                    case "-g":
                    case "--global": {
                        isGlobal = true;
                        break;
                    }
                    case "-t":
                    case "--target": {
                        let result = "";
                        while (argsCopy.length > 0 && !validFlags.has(argsCopy[0])) {
                            result += (result ? " " : "") + argsCopy.shift();
                        }
                        targetName = result.replace(/["@]/g, "");
                        break;
                    }
                    case "-l":
                    case "--limit": {
                        const valStr = argsCopy.shift();
                        if (valStr) {
                            const parsed = parseInt(valStr, 10);
                            if (!isNaN(parsed) && parsed > 0) {
                                limitVal = parsed;
                            }
                        }
                        break;
                    }
                    case "--reset-limit": {
                        resetLimit = true;
                        break;
                    }
                }
            }

            // Global settings route
            if (isGlobal) {
                if (resetLimit) {
                    world.setDynamicProperty("globalMaxHomes", undefined);
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Global home limit reset to default (${DEFAULT_MAX_HOMES}).`);
                    return;
                }

                if (limitVal === undefined) {
                    player.sendMessage(`§o§c[Paradox] Please specify a valid home limit integer.`);
                    return;
                }

                world.setDynamicProperty("globalMaxHomes", limitVal);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Global home limit set to ${limitVal} for all players.`);
                return;
            }

            // Individual player route
            if (!targetName) {
                const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
                player.sendMessage(`§o§c[Paradox] Usage: ${prefix}home [ -g | -t <player> ] [ -l <limit> | --reset-limit ]`);
                return;
            }

            const targetPlayer = PlayerCache.getPlayerByName(targetName);
            const targetId = targetPlayer ? targetPlayer.id : targetName; // Support setting DB override by target name or player reference

            const dbEntry = (await homesDB.get(targetId)) ?? { locations: [] };

            if (resetLimit) {
                dbEntry.maxHomes = undefined;
                await homesDB.set(targetId, dbEntry);

                const newLimit = await getMaxHomesForPlayer(targetId);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Reset home limit override for "${targetName}§7" (active limit: ${newLimit}).`);
                if (targetPlayer) {
                    targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your home limit override was reset by "${player.name}§7".`);
                }
                return;
            }

            if (limitVal === undefined) {
                player.sendMessage(`§o§c[Paradox] Please specify a valid home limit integer.`);
                return;
            }

            dbEntry.maxHomes = limitVal;
            await homesDB.set(targetId, dbEntry);

            player.sendMessage(`§2[§7Paradox§2]§o§7 Set home limit override for "${targetName}§7" to ${limitVal}.`);
            if (targetPlayer) {
                targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your home limit was set to ${limitVal} by "${player.name}§7".`);
            }
            return;
        }

        // Prevent command if player is imprisoned
        const isImprisoned = player.getDynamicProperty("prisonLocation");
        if (isImprisoned) {
            player.sendMessage(`§o§c[Paradox] You cannot use the home command while imprisoned!`);
            return;
        }

        // Determine player's effective maximum home limit
        const playerMaxHomes = await getMaxHomesForPlayer(player.id);

        const UNENCRYPTED_HOME_TAG_PREFIX = "home:";
        const obfuscatedKey = cryptoES.SHA256(message.sender.id).toString();

        const dbEntry = (await homesDB.get(player.id)) ?? { locations: [] };
        let playerHomes = Array.isArray(dbEntry?.locations) ? dbEntry!.locations : [];

        function encryptData(data: string): string {
            return cryptoES.AES.encrypt(data, obfuscatedKey).toString();
        }

        function decryptData(encryptedData: string): string {
            try {
                const bytes = cryptoES.AES.decrypt(encryptedData, obfuscatedKey);
                return bytes.toString(cryptoES.Utf8);
            } catch {
                return "";
            }
        }

        function formatDimension(dimension: string): string {
            if (!dimension) return "Unknown";
            return dimension
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
                .replace("The End", "The End");
        }

        function countHomes(): number {
            return playerHomes.length;
        }

        async function saveHomeLocation(homeName: string, location: Vector3, dimension: string): Promise<boolean> {
            const existingHome = playerHomes.some((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                return parts[1] === homeName;
            });

            if (existingHome) {
                return true;
            }

            const unencryptedTag = `${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}:${dimension.replace("minecraft:", "")}`;
            const encryptedContent = encryptData(unencryptedTag);
            playerHomes.push(encryptedContent);

            dbEntry.locations = playerHomes;
            await homesDB.set(player.id, dbEntry);
            return false;
        }

        async function deleteHomeLocation(homeName: string): Promise<boolean> {
            const index = playerHomes.findIndex((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                return parts[1] === homeName;
            });

            if (index !== -1) {
                playerHomes.splice(index, 1);
                dbEntry.locations = playerHomes;
                await homesDB.set(player.id, dbEntry);
                return true;
            }
            return false;
        }

        async function renameHomeLocation(oldName: string, newName: string): Promise<string> {
            const index = playerHomes.findIndex((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                return parts[1] === oldName;
            });

            if (index === -1) {
                return `§o§c[Paradox] Home location "${oldName}§c" not found!`;
            }

            const alreadyExists = playerHomes.some((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                return parts[1] === newName;
            });

            if (alreadyExists) {
                return `§o§c[Paradox] A home named "${newName}§c" already exists!`;
            }

            const decryptedTag = decryptData(playerHomes[index]);
            const parts = decryptedTag.split(":");
            parts[1] = newName;
            const updatedTag = parts.join(":");
            playerHomes[index] = encryptData(updatedTag);

            dbEntry.locations = playerHomes;
            await homesDB.set(player.id, dbEntry);
            return `§2[§7Paradox§2]§o§7 Home "${oldName}§7" renamed to "${newName}§7".`;
        }

        function listHomeLocations(): void {
            if (playerHomes.length > 0) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Your saved home locations (${playerHomes.length}/${playerMaxHomes}):`);
                playerHomes.forEach((encryptedContent) => {
                    const decryptedTag = decryptData(encryptedContent);
                    if (!decryptedTag) return;
                    const parts = decryptedTag.split(":");
                    if (parts.length < 4) return;
                    const [, homeName, location, dimension] = parts;
                    const [x, y, z] = location.split(",");
                    const formattedDimension = formatDimension(dimension);
                    player.sendMessage(` §o§7| [§f${homeName}§7] Dimension: §2${formattedDimension}§f, §7Location:§f ${x}, ${y}, ${z}`);
                });
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 You have no saved home locations!");
            }
        }

        function teleportToHomeLocation(homeName: string): void {
            const encryptedContent = playerHomes.find((content) => {
                const decryptedTag = decryptData(content);
                return decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`);
            });

            if (encryptedContent) {
                const decryptedTag = decryptData(encryptedContent);
                const parts = decryptedTag ? decryptedTag.split(":") : [];
                if (!decryptedTag || parts.length < 4) {
                    player.sendMessage("§o§c[Paradox] Corrupted home data detected.");
                    return;
                }
                const [, , location, dimension] = parts;
                const [x, y, z] = location.split(",");
                const teleportLocation = { x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) };

                const fullDimensionId = dimension.includes(":") ? dimension : `minecraft:${dimension}`;
                const dimensionType = world.getDimension(fullDimensionId);
                if (!dimensionType) {
                    player.sendMessage("§o§c[Paradox] Dimension not found. Teleport failed!");
                    return;
                }
                const success = player.tryTeleport(teleportLocation, { dimension: dimensionType });
                if (success) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Welcome to "${homeName}§7" ${player.name}§7!`);
                } else {
                    player.sendMessage(`§o§c[Paradox] Failed to teleport to "${homeName}§c"! Please try again.`);
                }
                return;
            }
            player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" not found!`);
        }

        const subCommand = args[0]?.toLowerCase();
        const homeName = args.slice(1).join(" ").replace(/[:"@]/g, "").trim();

        if (!homeName && subCommand && ["set", "delete", "teleport", "rename"].includes(subCommand)) {
            player.sendMessage(`§o§c[Paradox] Please provide a home name.`);
            return;
        }

        switch (subCommand) {
            case "set": {
                if (countHomes() >= playerMaxHomes) {
                    player.sendMessage(`§o§c[Paradox] You have reached your maximum limit of ${playerMaxHomes} homes!`);
                    return;
                }
                const location = player.location;
                const dimension = player.dimension.id;
                const existingHome = await saveHomeLocation(homeName, location, dimension);
                if (existingHome) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 A home named "${homeName}§7" already exists!`);
                    return;
                }
                player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" set successfully! (${countHomes()}/${playerMaxHomes})`);
                break;
            }
            case "delete": {
                const homeDeleted = await deleteHomeLocation(homeName);
                if (homeDeleted) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" deleted successfully!`);
                } else {
                    player.sendMessage(`§o§c[Paradox] Home location "${homeName}§c" not found!`);
                }
                break;
            }
            case "rename": {
                const toIndex = args.indexOf("--to");
                if (toIndex === -1) {
                    const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
                    player.sendMessage(`§o§c[Paradox] Usage: ${prefix}home rename <oldName> --to <newName>`);
                    return;
                }
                const oldName = args.slice(1, toIndex).join(" ").replace(/[:"@]/g, "").trim();
                const newName = args
                    .slice(toIndex + 1)
                    .join(" ")
                    .replace(/[:"@]/g, "")
                    .trim();

                if (!oldName || !newName) {
                    player.sendMessage("§o§c[Paradox] Please provide both the current name and the new name.");
                    return;
                }

                const resultMessage = await renameHomeLocation(oldName, newName);
                player.sendMessage(resultMessage);
                break;
            }
            case "teleport": {
                teleportToHomeLocation(homeName);
                break;
            }
            case "list": {
                listHomeLocations();
                break;
            }
            default: {
                const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
                player.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§chome help.`);
                break;
            }
        }
    },
};
