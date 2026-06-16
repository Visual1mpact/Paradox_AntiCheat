import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, Vector3, world } from "@minecraft/server";
import * as CryptoESImport from "../../node_modules/crypto-es";
import { homesDB } from "../../event-listeners/world-initialize";

const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

/**
 * Represents the home command.
 */
export const homeCommand: Command = {
    name: "home",
    description: "Manage personal home locations with encryption support.",
    usage: "{prefix}home <set | delete | rename | teleport | list | help> [ homeName ]",
    examples: [`{prefix}home set MyHome`, `{prefix}home delete MyHome`, `{prefix}home rename MyHome --to NewHome`, `{prefix}home teleport MyHome`, `{prefix}home list`, `{prefix}home help`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/store_home_icon.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Home Management",
        description:
            "Securely manage personal warp points for quick travel across dimensions.\n\n" +
            "§7Management:\n" +
            "§7• Save up to 5 unique locations with custom names.\n" +
            "§7• Teleport instantly to any saved home point.\n" +
            "§7• All location data is encrypted for your security.\n\n" +
            "§7Restrictions:\n" +
            "§7• Access is restricted while serving a prison sentence.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Set Home", icon: "textures/ui/store_home_icon.png", command: ["set"], description: "Set a new home location", requiredFields: ["homeNameText"], crypto: true, generateModalForm: true },
            { name: "Delete Home", icon: "textures/ui/icon_trash.png", command: ["delete"], description: "Delete an existing home location", requiredFields: ["homeNameDropdown"], crypto: true, generateModalForm: true },
            { name: "Rename Home", icon: "textures/ui/sidebar_icons/realms.png", command: ["rename"], description: "Rename an existing home location", requiredFields: ["homeNameDropdown", "newNameText"], crypto: true, generateModalForm: true },
            { name: "Teleport to Home", icon: "textures/ui/NetherPortalMirror.png", command: ["teleport"], description: "Teleport to a saved home location", requiredFields: ["homeNameDropdown"], crypto: true, generateModalForm: true },
            { name: "List Homes", icon: "textures/ui/icon_map.png", command: ["list"], description: "List all saved home locations", requiredFields: [], crypto: true },
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
        ],
    },

    /**
     * Executes the home command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {typeof CryptoES} cryptoES - The CryptoES namespace for encryption/decryption.
     */
    execute: async (message?: ChatSendBeforeEvent, args?: string[], cryptoParam?: typeof CryptoES): Promise<void> => {
        if (!message || !message.sender) return;
        const player = message.sender;
        args = args ?? [];
        const cryptoES = (cryptoParam ?? CryptoES) as typeof CryptoES;

        // Prevent command if player is imprisoned
        const isImprisoned = player.getDynamicProperty("prisonLocation"); // matches PRISON_LOCATION_PROPERTY
        if (isImprisoned) {
            player.sendMessage(`§o§c[Paradox] You cannot use the home command while imprisoned!`);
            return;
        }

        // Maximum number of homes a player can save
        const MAX_HOMES = 5;

        // Define the prefix for unencrypted home tags
        const UNENCRYPTED_HOME_TAG_PREFIX = "home:";

        // Define the prefix for encrypted home tags
        const ENCRYPTED_HOME_TAG_PREFIX = "encrypted_home:";

        // Transform the player ID to generate a unique key
        const obfuscatedKey = cryptoES.SHA256(message.sender.id).toString();

        // Load homes from database
        const dbEntry = homesDB.get(player.id);
        let playerHomes = Array.isArray(dbEntry?.locations) ? dbEntry!.locations : [];

        // Migration logic: move legacy tags to database
        const legacyTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
        if (legacyTags.length > 0) {
            let migrated = false;
            for (const tag of legacyTags) {
                const encryptedContent = tag.replace(ENCRYPTED_HOME_TAG_PREFIX, "");
                if (!playerHomes.includes(encryptedContent)) {
                    playerHomes.push(encryptedContent);
                    migrated = true;
                }
                player.removeTag(tag);
            }
            if (migrated) await homesDB.set(player.id, { locations: playerHomes });
        }

        /**
         * Helper function to encrypt data.
         * @param {string} data - The data to encrypt.
         * @returns {string} The encrypted data.
         */
        function encryptData(data: string): string {
            return cryptoES.AES.encrypt(data, obfuscatedKey).toString();
        }

        /**
         * Helper function to decrypt data.
         * @param {string} encryptedData - The encrypted data to decrypt.
         * @returns {string} The decrypted data.
         */
        function decryptData(encryptedData: string): string {
            try {
                const bytes = cryptoES.AES.decrypt(encryptedData, obfuscatedKey);
                return bytes.toString(cryptoES.Utf8);
            } catch {
                return "";
            }
        }

        /**
         * Helper function to format dimension strings.
         * @param {string} dimension - The dimension string to format.
         * @returns {string} The formatted dimension string.
         */
        function formatDimension(dimension: string): string {
            if (!dimension) return "Unknown";
            return dimension
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
                .replace("The End", "The End"); // Consistency check for The End
        }

        /**
         * Helper function to count the number of home locations a player has saved.
         * @returns {number} The number of saved homes.
         */
        function countHomes(): number {
            return playerHomes.length;
        }

        /**
         * Helper function to save home location.
         * @param {string} homeName - The name of the home location.
         * @param {Vector3} location - The location to save.
         * @param {string} dimension - The dimension of the location.
         * @returns {boolean} Returns true if a home with the same name already exists, false otherwise.
         */
        async function saveHomeLocation(homeName: string, location: Vector3, dimension: string): Promise<boolean> {
            const existingHome = playerHomes.some((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                const existingHomeName = parts[1];
                return existingHomeName === homeName;
            });

            if (existingHome) {
                return true; // Home with the same name already exists
            }

            const unencryptedTag = `${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}:${dimension.replace("minecraft:", "")}`;
            const encryptedContent = encryptData(unencryptedTag);
            playerHomes.push(encryptedContent);
            await homesDB.set(player.id, { locations: playerHomes });
            return false;
        }

        /**
         * Helper function to delete home location.
         * @param {string} homeName - The name of the home location to delete.
         * @returns {boolean} Returns true if the home location was deleted successfully, false if the home was not found.
         */
        async function deleteHomeLocation(homeName: string): Promise<boolean> {
            const index = playerHomes.findIndex((encryptedContent) => {
                const decryptedTag = decryptData(encryptedContent);
                if (!decryptedTag) return false;
                const parts = decryptedTag.split(":");
                return parts[1] === homeName;
            });

            if (index !== -1) {
                playerHomes.splice(index, 1);
                await homesDB.set(player.id, { locations: playerHomes });
                return true; // Home deleted successfully
            }
            return false; // Home not found
        }

        /**
         * Helper function to rename a home location.
         * @param {string} oldName - The current name of the home location.
         * @param {string} newName - The new name for the home location.
         * @returns {Promise<string>} Returns a message indicating the result.
         */
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

            await homesDB.set(player.id, { locations: playerHomes });
            return `§2[§7Paradox§2]§o§7 Home "${oldName}§7" renamed to "${newName}§7".`;
        }

        /**
         * Helper function to list all home locations.
         */
        function listHomeLocations(): void {
            if (playerHomes.length > 0) {
                player.sendMessage("§2[§7Paradox§2]§o§7 Your saved home locations:");
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

        /**
         * Helper function to teleport to a home location.
         * @param {string} homeName - The name of the home location to teleport to.
         */
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
                if (countHomes() >= MAX_HOMES) {
                    player.sendMessage(`§o§c[Paradox] You have reached the maximum number of homes (${MAX_HOMES})!`);
                    return;
                }
                const location = player.location; // Get the player's current location
                const dimension = player.dimension.id; // Get the name of the player's current dimension
                const existingHome = await saveHomeLocation(homeName, location, dimension);
                if (existingHome) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 A home named "${homeName}§7" already exists!`);
                    return;
                }
                player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" set successfully!`);
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
