import { PlayerLeaveAfterEvent, PlayerSpawnAfterEvent, Player } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/event-coordinator";

// Subscription holders for enabling/disabling
let playerSpawnSubscription: ((arg: PlayerSpawnAfterEvent) => void) | null = null;
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | null = null;

// Configurable constants
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 16;

// Dictionary to track logged-in player names for collision detection
const playerNameMap = new Map<string, Player>();

/**
 * Extracts the base name from a player's name by removing suffixes.
 * @param {string} name - The player's full name.
 * @returns {string} The base name.
 */
function getBaseName(name: string): string {
    return name.replace(/\(\d+\)$/, ""); // Normalize by removing "(number)" suffix
}

/**
 * Checks if a player's name violates naming conventions and initiates kick or ban actions.
 * @param {Player} player - The player whose name is being validated.
 * @returns {Promise<void>}
 */
async function checkNamespoof(player: Player): Promise<void> {
    const banRegex = /[^\x00-\x7F]|[/:\\*?"<>]|^\.$|\.$/gu;
    const kickRegex = /^(?![A-Za-z0-9_\s]{3,16}$).*$/g;
    const nameLength = player.name.length;

    // Check for invalid name length or banned characters
    if (nameLength < MIN_NAME_LENGTH || nameLength > MAX_NAME_LENGTH || banRegex.test(player.name)) {
        await banPlayer(player, "banned for violating naming rules");
    } else if (kickRegex.test(player.name)) {
        kickPlayer(player, "kicked for invalid name format");
    } else {
        checkDuplicateName(player);
    }
}

/**
 * Checks if a player's name has duplicates and kicks the player with the same base name.
 * @param {Player} player - The player being checked for name duplication.
 */
async function checkDuplicateName(player: Player) {
    const baseName = getBaseName(player.name);

    if (playerNameMap.has(baseName)) {
        await kickPlayer(player, "kicked for duplicate name");
    } else {
        playerNameMap.set(baseName, player);
    }
}

/**
 * Kicks a player from the server with a message.
 * @param {Player} player - The player to be kicked.
 * @param {string} reason - The reason for kicking the player.
 */
async function kickPlayer(player: Player, reason: string) {
    player.runCommand(`kick @s ${reason}`);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Player "${player.name}§7" has been ${reason}§7.`);
}

/**
 * Bans a player, adds them to the banned list, and then kicks them.
 * @param {Player} player - The player to be banned.
 * @param {string} reason - The reason for banning the player.
 * @returns {Promise<void>}
 */
async function banPlayer(player: Player, reason: string): Promise<void> {
    try {
        const name = player.name;

        const bannedPlayers = (await banlistDB.get("players")) ?? {};

        if (!(name in bannedPlayers)) {
            bannedPlayers[name] = {
                reason,
                bannedBy: "Server", // You can customize this to track who issued the ban
                timestamp: Date.now(),
            };
            await banlistDB.set("players", bannedPlayers);
        }

        await kickPlayer(player, reason);
    } catch (error) {
        console.error(`[Paradox] Failed to ban player '${player.name}': ${error}`);
    }
}

/**
 * Starts the Namespoof detection by subscribing to playerSpawn and playerLeave events.
 */
export function startNamespoofDetection() {
    if (!playerSpawnSubscription) {
        playerSpawnSubscription = async (event) => {
            if (event.initialSpawn) {
                await checkNamespoof(event.player);
            }
        };
        EventCoordinator.subscribeAfter("playerSpawn", playerSpawnSubscription);
    }

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = (event) => {
            const baseName = getBaseName(event.playerName);
            playerNameMap.delete(baseName); // Remove player from map when they leave
        };
        EventCoordinator.subscribeAfter("playerLeave", playerLeaveSubscription);
    }
}

/**
 * Stops the Namespoof detection by unsubscribing from events and clearing the name map.
 */
export function stopNamespoofDetection() {
    if (playerSpawnSubscription) {
        EventCoordinator.unsubscribeAfter("playerSpawn", playerSpawnSubscription);
        playerSpawnSubscription = null;
    }
    if (playerLeaveSubscription) {
        EventCoordinator.unsubscribeAfter("playerLeave", playerLeaveSubscription);
        playerLeaveSubscription = null;
    }
    playerNameMap.clear();
}
