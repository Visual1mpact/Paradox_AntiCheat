import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, Vector3, world } from "@minecraft/server";
import * as CryptoESImport from "../../node_modules/crypto-es";

const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

/**
 * Represents the home command.
 */
export const homeCommand: Command = {
    name: "home",
    description: "Manage home locations.",
    usage: "{prefix}home <set | delete | teleport | list | help> [ homeName ]",
    examples: [`{prefix}home set MyHome`, `{prefix}home delete MyHome`, `{prefix}home teleport MyHome`, `{prefix}home list`, `{prefix}home help`],
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
            { name: "Set Home", icon: "textures/ui/store_home_icon.png", command: ["set"], description: "Set a new home location", requiredFields: ["homeName"], crypto: true, generateModalForm: true },
            { name: "Delete Home", icon: "textures/ui/icon_trash.png", command: ["delete"], description: "Delete an existing home location", requiredFields: ["homeName"], crypto: true, generateModalForm: true },
            { name: "Teleport to Home", icon: "textures/ui/NetherPortalMirror.png", command: ["teleport"], description: "Teleport to a saved home location", requiredFields: ["homeName"], crypto: true, generateModalForm: true },
            { name: "List Homes", icon: "textures/ui/icon_map.png", command: ["list"], description: "List all saved home locations", requiredFields: [], crypto: true },
        ],
        dynamicFields: [{ name: "\nName of Home:", type: "text", placeholder: "Enter Home Name", requiredFields: ["homeName"] }],
    },

    /**
     * Executes the home command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {typeof CryptoES} cryptoES - The CryptoES namespace for encryption/decryption.
     */
    execute: (message?: ChatSendBeforeEvent, args?: string[], cryptoParam?: typeof CryptoES): void | Promise<boolean | void> | ((object: any) => void) => {
        if (!message || !message.sender) return;
        const player = message.sender;
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
            const bytes = cryptoES.AES.decrypt(encryptedData, obfuscatedKey);
            return cryptoES.Utf8.stringify(bytes);
        }

        /**
         * Helper function to format dimension strings.
         * @param {string} dimension - The dimension string to format.
         * @returns {string} The formatted dimension string.
         */
        function formatDimension(dimension: string): string {
            // Capitalize the first letter of each word
            const formattedDimension = dimension.replace(/(^|_)(\w)/g, (_, __, letter) => letter.toUpperCase());

            // Replace "TheEnd" with "The End"
            if (formattedDimension === "TheEnd") {
                return "The End";
            }

            return formattedDimension;
        }

        /**
         * Helper function to count the number of home locations a player has saved.
         * @returns {number} The number of saved homes.
         */
        function countHomes(): number {
            return player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX)).length;
        }

        /**
         * Helper function to save home location.
         * @param {string} homeName - The name of the home location.
         * @param {Vector3} location - The location to save.
         * @param {string} dimension - The dimension of the location.
         * @returns {boolean} Returns true if a home with the same name already exists, false otherwise.
         */
        function saveHomeLocation(homeName: string, location: Vector3, dimension: string): boolean {
            const existingHome = player.getTags().find((tag) => {
                if (tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX)) {
                    const decryptedTag = decryptData(tag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                    const [, existingHomeName] = decryptedTag.split(":");
                    return existingHomeName === homeName;
                }
                return false; // Skip non-encrypted tags
            });

            if (existingHome) {
                return true; // Home with the same name already exists
            }

            const unencryptedTag = `${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}:${dimension.replace("minecraft:", "")}`;
            const encryptedTag = `${ENCRYPTED_HOME_TAG_PREFIX}${encryptData(unencryptedTag)}`;
            player.addTag(encryptedTag);
            return false;
        }

        /**
         * Helper function to delete home location.
         * @param {string} homeName - The name of the home location to delete.
         * @returns {boolean} Returns true if the home location was deleted successfully, false if the home was not found.
         */
        function deleteHomeLocation(homeName: string): boolean {
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            for (const encryptedTag of encryptedTags) {
                const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                if (decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`)) {
                    player.removeTag(encryptedTag);
                    return true; // Home deleted successfully
                }
            }
            return false; // Home not found
        }

        /**
         * Helper function to list all home locations.
         */
        function listHomeLocations(): void {
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            if (encryptedTags.length > 0) {
                player.sendMessage("§2[§7Paradox§2]§o§7 Your saved home locations:");
                encryptedTags.forEach((encryptedTag) => {
                    const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                    const [, homeName, location, dimension] = decryptedTag.split(":");
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
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            for (const encryptedTag of encryptedTags) {
                const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                if (decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`)) {
                    const [, , location, dimension] = decryptedTag.split(":");
                    const [x, y, z] = location.split(",");
                    const teleportLocation = { x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) };
                    const dimensionType = world.getDimension(dimension);
                    if (!dimensionType) {
                        player.sendMessage("§o§c[Paradox] Dimension not found. Teleport failed!");
                        return;
                    }
                    const teleportOptions = { dimension: dimensionType };
                    const success = player.tryTeleport(teleportLocation, teleportOptions);
                    if (success) {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 Welcome to "${homeName}§7" ${player.name}§7!`);
                    } else {
                        player.sendMessage(`§o§c[Paradox] Failed to teleport to "${homeName}§c"! Please try again.`);
                    }
                    return;
                }
            }
            player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" not found!`);
        }

        const subCommand = args?.[0]?.toLowerCase();
        const homeName = args?.slice(1).join(" ") ?? "";

        if (!homeName && subCommand && ["set", "delete", "teleport"].includes(subCommand)) {
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
                const existingHome = saveHomeLocation(homeName, location, dimension);
                if (existingHome) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 A home named "${homeName}§7" already exists!`);
                    return;
                }
                player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" set successfully!`);
                break;
            }
            case "delete": {
                const homeDeleted = deleteHomeLocation(homeName);
                if (homeDeleted) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}§7" deleted successfully!`);
                } else {
                    player.sendMessage(`§o§c[Paradox] Home location "${homeName}§c" not found!`);
                }
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
