import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, Vector3 } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import CryptoES from "../../node_modules/crypto-es/lib/index";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "Home Management",
        description: "Select an action to manage your home locations.",
        commandOrder: "command-arg",
        actions: [
            { name: "Set Home", command: ["set"], description: "Set a new home location", requiredFields: ["homeName"], crypto: true },
            { name: "Delete Home", command: ["delete"], description: "Delete an existing home location", requiredFields: ["homeName"], crypto: true },
            { name: "Teleport to Home", command: ["teleport"], description: "Teleport to a saved home location", requiredFields: ["homeName"], crypto: true },
            { name: "List Homes", command: ["list"], description: "List all saved home locations", requiredFields: [], crypto: true },
        ],
        dynamicFields: [{ name: "homeName", arg: undefined, type: "text", placeholder: "Enter home name" }],
    },

    /**
     * Executes the home command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     * @param {typeof CryptoES} cryptoES - The CryptoES namespace for encryption/decryption.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment, cryptoES: typeof CryptoES) => {
        const system = minecraftEnvironment.getSystem();
        const world = minecraftEnvironment.getWorld();
        const player = message.sender;

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
            return bytes.toString(cryptoES.enc.Utf8);
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
            const totalHomes = countHomes();
            if (totalHomes >= MAX_HOMES) {
                player.sendMessage(`§cYou have reached the maximum number of homes (${MAX_HOMES})!`);
                return true;
            }
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
                    const dimensionType = minecraftEnvironment.getWorld().getDimension(dimension);
                    const teleportOptions = { dimension: dimensionType };
                    const success = player.tryTeleport(teleportLocation, teleportOptions);
                    if (success) {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 Welcome to "${homeName}" ${player.name}!`);
                    } else {
                        player.sendMessage(`§cFailed to teleport to "${homeName}"! Please try again.`);
                    }
                    return;
                }
            }
            player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}" not found!`);
        }

        const subCommand = args[0]?.toLowerCase();
        const homeName = args.slice(1).join(" ");

        switch (subCommand) {
            case "set": {
                const id = system.run(() => {
                    const location = player.location; // Get the player's current location
                    const dimension = player.dimension.id; // Get the name of the player's current dimension
                    const existingHome = saveHomeLocation(homeName, location, dimension);
                    if (existingHome) {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 A home named "${homeName}" already exists!`);
                        return system.clearRun(id);
                    }
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}" set successfully!`);
                });
                break;
            }
            case "delete": {
                system.run(() => {
                    const homeDeleted = deleteHomeLocation(homeName);
                    if (homeDeleted) {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 Home location "${homeName}" deleted successfully!`);
                    } else {
                        player.sendMessage(`§cHome location "${homeName}" not found!`);
                    }
                });
                break;
            }
            case "teleport": {
                system.run(() => {
                    teleportToHomeLocation(homeName);
                });
                break;
            }
            case "list": {
                listHomeLocations();
                break;
            }
            default:
                const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
                player.sendMessage(`§cInvalid arguments. For help, use ${prefix}home help.`);
                break;
        }
    },
};
