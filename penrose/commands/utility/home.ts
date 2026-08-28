import { Command } from "../../classes/core/command-handler";
import { ChatSendBeforeEvent, Player, Vector3, world } from "@minecraft/server";
import * as CryptoES from "../../node_modules/crypto-es";
import { homesDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

const DEFAULT_MAX_HOMES = 5;
const UNENCRYPTED_HOME_TAG_PREFIX = "home:";

/**
 * Interface representing a player's raw home database structure.
 */
interface HomeDatabaseEntry {
    locations: string[];
    maxHomes?: number;
}

/**
 * Interface representing parsed flag parameters for administrative commands.
 */
interface AdminHomeFlags {
    isGlobal: boolean;
    targetName: string;
    limitVal?: number;
    resetLimit: boolean;
}

/**
 * Helper to fetch the applicable maximum home count for a specific player ID.
 * Hierarchy: Per-Player DB Override -> World Dynamic Property -> Default (5)
 * @param {string} playerId - The target player's unique identifier.
 * @returns {Promise<number>} The dynamic maximum allowed homes.
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
 * Encrypts plain text string data using AES with an obfuscated key.
 * @param {string} data - Plain text data to encrypt.
 * @param {string} obfuscatedKey - SHA256 derived key.
 * @param {typeof CryptoES} cryptoES - The CryptoES instance.
 * @returns {string} Encrypted cipher text.
 */
function encryptData(data: string, obfuscatedKey: string, cryptoES: typeof CryptoES): string {
    return cryptoES.AES.encrypt(data, obfuscatedKey).toString();
}

/**
 * Decrypts AES encrypted cipher text using an obfuscated key.
 * @param {string} encryptedData - Encrypted cipher text.
 * @param {string} obfuscatedKey - SHA256 derived key.
 * @param {typeof CryptoES} cryptoES - The CryptoES instance.
 * @returns {string} Decrypted plain text or empty string on failure.
 */
function decryptData(encryptedData: string, obfuscatedKey: string, cryptoES: typeof CryptoES): string {
    try {
        const bytes = cryptoES.AES.decrypt(encryptedData, obfuscatedKey);
        return bytes.toString(cryptoES.Utf8);
    } catch {
        return "";
    }
}

/**
 * Formats dimension identifiers into readable title-case display names.
 * @param {string} dimension - Raw dimension ID string.
 * @returns {string} Formatted title-case dimension string.
 */
function formatDimension(dimension: string): string {
    if (!dimension) return "Unknown";
    return dimension
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .replace("The End", "The End");
}

/**
 * Parses raw command arguments into structured administrative flag options.
 * @param {string[]} args - Command arguments array.
 * @returns {AdminHomeFlags} Parsed command flags.
 */
function parseAdminFlags(args: string[]): AdminHomeFlags {
    let targetName = "";
    let isGlobal = false;
    let limitVal: number | undefined;
    let resetLimit = false;

    const validFlags = new Set(["-t", "--target", "-g", "--global", "-l", "--limit", "--reset-limit"]);
    const argsCopy = [...args];

    while (argsCopy.length > 0) {
        const flag = argsCopy.shift();
        if (flag === "-g" || flag === "--global") {
            isGlobal = true;
        } else if (flag === "-t" || flag === "--target") {
            let result = "";
            while (argsCopy.length > 0 && argsCopy[0] !== undefined && !validFlags.has(argsCopy[0])) {
                result += (result ? " " : "") + argsCopy.shift();
            }
            targetName = result.replace(/["@]/g, "");
        } else if (flag === "-l" || flag === "--limit") {
            const valStr = argsCopy.shift();
            if (valStr) {
                const parsed = parseInt(valStr, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    limitVal = parsed;
                }
            }
        } else if (flag === "--reset-limit") {
            resetLimit = true;
        }
    }

    return {
        isGlobal,
        targetName,
        resetLimit,
        ...(limitVal !== undefined ? { limitVal } : {}),
    };
}

/**
 * Handles global home limit configuration commands.
 * @param {Player} player - The executing admin player.
 * @param {AdminHomeFlags} flags - Parsed administration flags.
 */
function handleGlobalLimitAdmin(player: Player, flags: AdminHomeFlags): void {
    if (flags.resetLimit) {
        world.setDynamicProperty("globalMaxHomes", undefined);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Global home limit reset to default (${DEFAULT_MAX_HOMES}).`);
        return;
    }

    if (flags.limitVal === undefined) {
        player.sendMessage(`§o§c[Paradox] Please specify a valid home limit integer.`);
        return;
    }

    world.setDynamicProperty("globalMaxHomes", flags.limitVal);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Global home limit set to ${flags.limitVal} for all players.`);
}

/**
 * Handles target player home limit override settings.
 * @param {Player} player - The executing admin player.
 * @param {AdminHomeFlags} flags - Parsed administration flags.
 */
async function handleTargetLimitAdmin(player: Player, flags: AdminHomeFlags): Promise<void> {
    if (!flags.targetName) {
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        player.sendMessage(`§o§c[Paradox] Usage: ${prefix}home [ -g | -t <player> ] [ -l <limit> | --reset-limit ]`);
        return;
    }

    const targetPlayer = PlayerCache.getPlayerByName(flags.targetName);
    const targetId = targetPlayer ? targetPlayer.id : flags.targetName;
    const dbEntry: HomeDatabaseEntry = (await homesDB.get(targetId)) ?? { locations: [] };

    if (flags.resetLimit) {
        delete dbEntry.maxHomes;
        await homesDB.set(targetId, dbEntry);

        const newLimit = await getMaxHomesForPlayer(targetId);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Reset home limit override for "${flags.targetName}§7" (active limit: ${newLimit}).`);
        if (targetPlayer) {
            targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your home limit override was reset by "${player.name}§7".`);
        }
        return;
    }

    if (flags.limitVal === undefined) {
        player.sendMessage(`§o§c[Paradox] Please specify a valid home limit integer.`);
        return;
    }

    dbEntry.maxHomes = flags.limitVal;
    await homesDB.set(targetId, dbEntry);

    player.sendMessage(`§2[§7Paradox§2]§o§7 Set home limit override for "${flags.targetName}§7" to ${flags.limitVal}.`);
    if (targetPlayer) {
        targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your home limit was set to ${flags.limitVal} by "${player.name}§7".`);
    }
}

/**
 * Executes administrative modification routes for global or target player home limits.
 * @param {Player} player - Executing command player.
 * @param {string[]} args - Command arguments.
 */
async function handleAdminFlags(player: Player, args: string[]): Promise<void> {
    const senderClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;
    if (senderClearance < 4) {
        player.sendMessage(`§o§c[Paradox] You do not have permission to modify home limits.`);
        return;
    }

    const flags = parseAdminFlags(args);
    if (flags.isGlobal) {
        handleGlobalLimitAdmin(player, flags);
    } else {
        await handleTargetLimitAdmin(player, flags);
    }
}

/**
 * Saves or updates a given home location for the player.
 * @param {Player} player - Target player object.
 * @param {string} homeName - Name of the home.
 * @param {Vector3} location - Target vector coordinates.
 * @param {string} dimension - Target dimension identifier string.
 * @param {HomeDatabaseEntry} dbEntry - Home database object reference.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 * @returns {Promise<boolean>} True if home already exists, false otherwise.
 */
async function saveHomeLocation(
    player: Player,
    homeName: string,
    location: Vector3,
    dimension: string,
    dbEntry: HomeDatabaseEntry,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): Promise<boolean> {
    const existingHome = dbEntry.locations.some((encryptedContent) => {
        const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
        if (!decryptedTag) return false;
        const parts = decryptedTag.split(":");
        return parts[1] === homeName;
    });

    if (existingHome) {
        return true;
    }

    const unencryptedTag = `${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}:${dimension.replace("minecraft:", "")}`;
    const encryptedContent = encryptData(unencryptedTag, obfuscatedKey, cryptoES);
    dbEntry.locations.push(encryptedContent);

    await homesDB.set(player.id, dbEntry);
    return false;
}

/**
 * Deletes a designated home location.
 * @param {Player} player - Target player object.
 * @param {string} homeName - Name of the home to delete.
 * @param {HomeDatabaseEntry} dbEntry - Home database object reference.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 * @returns {Promise<boolean>} True if found and deleted, false if non-existent.
 */
async function deleteHomeLocation(
    player: Player,
    homeName: string,
    dbEntry: HomeDatabaseEntry,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): Promise<boolean> {
    const index = dbEntry.locations.findIndex((encryptedContent) => {
        const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
        if (!decryptedTag) return false;
        const parts = decryptedTag.split(":");
        return parts[1] === homeName;
    });

    if (index !== -1) {
        dbEntry.locations.splice(index, 1);
        await homesDB.set(player.id, dbEntry);
        return true;
    }
    return false;
}

/**
 * Renames an existing home location.
 * @param {Player} player - Target player object.
 * @param {string} oldName - Target home to rename.
 * @param {string} newName - New designated name.
 * @param {HomeDatabaseEntry} dbEntry - Home database object reference.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 * @returns {Promise<string>} Execution feedback message string.
 */
async function renameHomeLocation(
    player: Player,
    oldName: string,
    newName: string,
    dbEntry: HomeDatabaseEntry,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): Promise<string> {
    const index = dbEntry.locations.findIndex((encryptedContent) => {
        const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
        if (!decryptedTag) return false;
        const parts = decryptedTag.split(":");
        return parts[1] === oldName;
    });

    if (index === -1) {
        return `§o§c[Paradox] Home location "${oldName}§c" not found!`;
    }

    const alreadyExists = dbEntry.locations.some((encryptedContent) => {
        const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
        if (!decryptedTag) return false;
        const parts = decryptedTag.split(":");
        return parts[1] === newName;
    });

    if (alreadyExists) {
        return `§o§c[Paradox] A home named "${newName}§c" already exists!`;
    }

    const encryptedHome = dbEntry.locations[index];
    if (!encryptedHome) {
        return `§o§c[Paradox] Home location "${oldName}§c" could not be decrypted!`;
    }

    const decryptedTag = decryptData(encryptedHome, obfuscatedKey, cryptoES);
    if (!decryptedTag) {
        return `§o§c[Paradox] Home location "${oldName}§c" could not be decrypted!`;
    }

    const parts = decryptedTag.split(":");
    parts[1] = newName;
    const updatedTag = parts.join(":");
    dbEntry.locations[index] = encryptData(updatedTag, obfuscatedKey, cryptoES);

    await homesDB.set(player.id, dbEntry);
    return `§2[§7Paradox§2]§o§7 Home "${oldName}§7" renamed to "${newName}§7".`;
}

/**
 * Prints all saved home locations to player chat.
 * @param {Player} player - Target player receiving output.
 * @param {string[]} homes - Encrypted homes array.
 * @param {number} playerMaxHomes - Active dynamic home limit.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 */
function listHomeLocations(
    player: Player,
    homes: string[],
    playerMaxHomes: number,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): void {
    if (homes.length === 0) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You have no saved home locations!");
        return;
    }

    player.sendMessage(`§2[§7Paradox§2]§o§7 Your saved home locations (${homes.length}/${playerMaxHomes}):`);
    homes.forEach((encryptedContent) => {
        const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
        if (!decryptedTag) return;
        const parts = decryptedTag.split(":");
        if (parts.length < 4) return;
        const [, homeName, location, dimension] = parts;
        if (!location) return;
        const [x, y, z] = location.split(",");
        const formattedDimension = formatDimension(dimension ?? "");
        player.sendMessage(` §o§7| [§f${homeName}§7] Dimension: §2${formattedDimension}§f, §7Location:§f ${x}, ${y}, ${z}`);
    });
}

/**
 * Teleports player to specified saved home name.
 * @param {Player} player - Teleporting player.
 * @param {string} homeName - Target home location key.
 * @param {string[]} homes - Encrypted homes array.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 */
function teleportToHomeLocation(
    player: Player,
    homeName: string,
    homes: string[],
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): void {
    const encryptedContent = homes.find((content) => {
        const decryptedTag = decryptData(content, obfuscatedKey, cryptoES);
        return decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`);
    });

    if (!encryptedContent) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" not found!`);
        return;
    }

    const decryptedTag = decryptData(encryptedContent, obfuscatedKey, cryptoES);
    const parts = decryptedTag ? decryptedTag.split(":") : [];
    if (!decryptedTag || parts.length < 4 || !parts[2] || !parts[3]) {
        player.sendMessage("§o§c[Paradox] Corrupted home data detected.");
        return;
    }

    const [, , location, dimension] = parts;
    const [x, y, z] = location.split(",");
    if (x === undefined || y === undefined || z === undefined) {
        player.sendMessage("§o§c[Paradox] Corrupted home data detected.");
        return;
    }

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
}

/**
 * Handles "set" sub-command execution logic.
 * @param {Player} player - Target player object.
 * @param {string} homeName - Specified target name.
 * @param {HomeDatabaseEntry} dbEntry - Home database object reference.
 * @param {number} playerMaxHomes - Max home threshold allowed.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 */
async function handleSetSubcommand(
    player: Player,
    homeName: string,
    dbEntry: HomeDatabaseEntry,
    playerMaxHomes: number,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): Promise<void> {
    if (dbEntry.locations.length >= playerMaxHomes) {
        player.sendMessage(`§o§c[Paradox] You have reached your maximum limit of ${playerMaxHomes} homes!`);
        return;
    }

    const transform = PlayerLocationCache.getTransform(player);
    const location = transform?.location ?? player.location;
    const dimension = transform?.dimension.id ?? player.dimension.id;

    const existingHome = await saveHomeLocation(player, homeName, location, dimension, dbEntry, obfuscatedKey, cryptoES);
    if (existingHome) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 A home named "${homeName}§7" already exists!`);
        return;
    }

    player.sendMessage(
        `§2[§7Paradox§2]§o§7 Home location "${homeName}§7" set successfully! (${dbEntry.locations.length}/${playerMaxHomes})`
    );
}

/**
 * Handles "rename" sub-command execution logic.
 * @param {Player} player - Target player object.
 * @param {string[]} args - Command arguments.
 * @param {HomeDatabaseEntry} dbEntry - Home database object reference.
 * @param {string} obfuscatedKey - Derived cryptographic key.
 * @param {typeof CryptoES} cryptoES - The CryptoES library instance.
 */
async function handleRenameSubcommand(
    player: Player,
    args: string[],
    dbEntry: HomeDatabaseEntry,
    obfuscatedKey: string,
    cryptoES: typeof CryptoES
): Promise<void> {
    const toIndex = args.indexOf("--to");
    if (toIndex === -1) {
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
        player.sendMessage(`§o§c[Paradox] Usage: ${prefix}home rename <oldName> --to <newName>`);
        return;
    }

    const oldName = args.slice(1, toIndex).join(" ").replace(/[:"@]/g, "").trim();
    const newName = args.slice(toIndex + 1).join(" ").replace(/[:"@]/g, "").trim();

    if (!oldName || !newName) {
        player.sendMessage("§o§c[Paradox] Please provide both the current name and the new name.");
        return;
    }

    const resultMessage = await renameHomeLocation(player, oldName, newName, dbEntry, obfuscatedKey, cryptoES);
    player.sendMessage(resultMessage);
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

        const hasAdminFlags = args.some((flag) =>
            ["-t", "--target", "-g", "--global", "-l", "--limit", "--reset-limit"].includes(flag)
        );
        if (hasAdminFlags) {
            await handleAdminFlags(player, args);
            return;
        }

        if (player.getDynamicProperty("prisonLocation")) {
            player.sendMessage(`§o§c[Paradox] You cannot use the home command while imprisoned!`);
            return;
        }

        const playerMaxHomes = await getMaxHomesForPlayer(player.id);
        const obfuscatedKey = cryptoES.SHA256(player.id).toString();

        const rawDbEntry = (await homesDB.get(player.id)) as HomeDatabaseEntry | undefined;
        const dbEntry: HomeDatabaseEntry = {
            locations: Array.isArray(rawDbEntry?.locations) ? rawDbEntry.locations : [],
            ...(rawDbEntry?.maxHomes !== undefined ? { maxHomes: rawDbEntry.maxHomes } : {}),
        };

        const subCommand = args[0]?.toLowerCase();
        const homeName = args.slice(1).join(" ").replace(/[:"@]/g, "").trim();

        if (!homeName && subCommand && ["set", "delete", "teleport", "rename"].includes(subCommand)) {
            player.sendMessage(`§o§c[Paradox] Please provide a home name.`);
            return;
        }

        switch (subCommand) {
            case "set": {
                await handleSetSubcommand(player, homeName, dbEntry, playerMaxHomes, obfuscatedKey, cryptoES);
                break;
            }
            case "delete": {
                const homeDeleted = await deleteHomeLocation(player, homeName, dbEntry, obfuscatedKey, cryptoES);
                if (homeDeleted) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" deleted successfully!`);
                } else {
                    player.sendMessage(`§o§c[Paradox] Home location "${homeName}§c" not found!`);
                }
                break;
            }
            case "rename": {
                await handleRenameSubcommand(player, args, dbEntry, obfuscatedKey, cryptoES);
                break;
            }
            case "teleport": {
                teleportToHomeLocation(player, homeName, dbEntry.locations, obfuscatedKey, cryptoES);
                break;
            }
            case "list": {
                listHomeLocations(player, dbEntry.locations, playerMaxHomes, obfuscatedKey, cryptoES);
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
