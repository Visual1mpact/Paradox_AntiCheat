import { PlayerLeaveAfterEvent, PlayerSpawnAfterEvent, world, Player } from "@minecraft/server";

// Subscription holders for enabling/disabling
let playerSpawnSubscription: ((arg: PlayerSpawnAfterEvent) => void) | null = null;
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | null = null;

// Configurable constants
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 16;
const BAN_REASON = "Namespoofing";

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
 */
function checkNamespoof(player: Player) {
    const banRegex = /[^\x00-\x7F]|[/:\\*?"<>]|^\.$|\.$/gu;
    const kickRegex = /^(?![A-Za-z0-9_\s]{3,16}$).*$/g;
    const nameLength = player.name.length;

    // Check for invalid name length or banned characters
    if (nameLength < MIN_NAME_LENGTH || nameLength > MAX_NAME_LENGTH || banRegex.test(player.name)) {
        banPlayer(player, "banned for violating naming rules");
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
function checkDuplicateName(player: Player) {
    const baseName = getBaseName(player.name);

    if (playerNameMap.has(baseName)) {
        kickPlayer(player, "kicked for duplicate name");
    } else {
        playerNameMap.set(baseName, player);
    }
}

/**
 * Kicks a player from the server with a message.
 * @param {Player} player - The player to be kicked.
 * @param {string} reason - The reason for kicking the player.
 */
function kickPlayer(player: Player, reason: string) {
    const dimension = world.getDimension(player.dimension.id);
    dimension.runCommandAsync(`kick ${player.name} §o§7\n\n${reason}`);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Player "${player.name}" has been ${reason}.`);
}

/**
 * Bans a player, adds them to the banned list, and then kicks them.
 * @param {Player} player - The player to be banned.
 * @param {string} reason - The reason for banning the player.
 */
function banPlayer(player: Player, reason: string) {
    try {
        const bannedPlayersString = (world.getDynamicProperty("bannedPlayers") as string) ?? "[]";
        const bannedPlayers = JSON.parse(bannedPlayersString);

        if (!bannedPlayers.includes(player.name)) {
            bannedPlayers.push(player.name);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
        }

        player.addTag(`paradoxBanned:${BAN_REASON}`);
        kickPlayer(player, reason);
    } catch (error) {
        console.error(`Failed to ban player: ${error}`);
    }
}

/**
 * Starts the Namespoof detection by subscribing to playerSpawn and playerLeave events.
 */
export function startNamespoofDetection() {
    if (!playerSpawnSubscription) {
        playerSpawnSubscription = world.afterEvents.playerSpawn.subscribe((event) => {
            if (event.initialSpawn) {
                checkNamespoof(event.player);
            }
        });
    }

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = world.afterEvents.playerLeave.subscribe((event) => {
            const baseName = getBaseName(event.playerName);
            playerNameMap.delete(baseName); // Remove player from map when they leave
        });
    }
}

/**
 * Stops the Namespoof detection by unsubscribing from events and clearing the name map.
 */
export function stopNamespoofDetection() {
    if (playerSpawnSubscription) {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawnSubscription);
        playerSpawnSubscription = null;
    }
    if (playerLeaveSubscription) {
        world.afterEvents.playerLeave.unsubscribe(playerLeaveSubscription);
        playerLeaveSubscription = null;
    }
    playerNameMap.clear();
}
