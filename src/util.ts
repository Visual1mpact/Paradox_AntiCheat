import { GameMode, Player, PlayerLeaveAfterEvent, Vector, world } from "@minecraft/server";
import config from "./data/config.js";
import { kickablePlayers } from "./kickcheck.js";
import { ScoreManager } from "./classes/ScoreManager.js";

const overworld = world.getDimension("overworld");
const timerMap = new Map<string, number>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    timerMap.delete(playerName);
}
world.afterEvents.playerLeave.subscribe(onPlayerLogout);

/**
 * Flag players who trigger certain checks or sub-checks, with information about the type of hack, the item involved, and any debug information available.
 *
 * @name flag
 * @param {Player} player - The player object
 * @param {string} check - What check ran the function.
 * @param {string} checkType - What sub-check ran the function (ex. a, b ,c).
 * @param {string} hackType - What the hack is considered as (ex. movement, combat, exploit).
 * @param {string} item - Item object.
 * @param {number} stack - Item object stack.
 * @param {string} debugName - Name for the debug value.
 * @param {string} debug - Debug info.
 * @param {boolean} shouldTP - Whever to tp the player to itself.
 */
export function flag(player: Player, check: string, checkType: string, hackType: string, item: string, stack: number, debugName: string, debug: string, shouldTP: boolean) {
    if (shouldTP) {
        player.teleport(new Vector(player.location.x, player.location.y, player.location.z), { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
    }

    ScoreManager.setScore(player, `${check.toLowerCase()}vl`, 1, true);

    if (debug) {
        sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= ${ScoreManager.getScore(check.toLowerCase() + "vl", player)}`);
    } else if (item && stack) {
        sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${item.replace("minecraft:", "")}=${stack})§4. VL= ${ScoreManager.getScore(check.toLowerCase() + "vl", player)}`);
    } else {
        sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType}. VL= ${ScoreManager.getScore(check.toLowerCase() + "vl", player)}`);
    }

    if (check === "Namespoof") {
        player.runCommandAsync(`kick "${player.name}" §f\n\n§4[§6Paradox§4]§f You have illegal characters in your name!`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    }
}

/**
 * This function sends a kick message to a banned player, including the banning moderator and reason. If ban appeals are enabled, a Discord link will also be included in the message. If the player cannot be kicked, they will be despawned instantly.
 *
 * @name banMessage
 * @param {Player} player - The player object
 */
export function banMessage(player: Player) {
    const tags = player.getTags();

    let reason: string;
    let by: string;

    for (const tag of tags) {
        if (tag.startsWith("By:")) {
            by = tag.slice(3);
        } else if (tag.startsWith("Reason:")) {
            reason = tag.slice(7);
        }
    }

    if (config.modules.banAppeal.enabled === true) {
        player.runCommandAsync(`kick "${player.name}" §f\n§l§4YOU ARE BANNED!§r\n§4[§6Banned By§4]§f: ${by || "§7N/A"}\n§4[§6Reason§4]§f: ${reason || "§7N/A"}\n§b${config.modules.banAppeal.discordLink}`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    } else {
        player.runCommandAsync(`kick "${player.name}" §f\n§l§4YOU ARE BANNED!\n§r\n§4[§6Banned By§4]§f: ${by || "§7N/A"}\n§4[§6Reason§4]§f: ${reason || "§7N/A"}`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    }

    // Notify staff that a player was banned
    sendMsg("@a[tag=paradoxOpped]", [`§f§4[§6Paradox§4]§f ${player.name} has been banned!`, `§4[§6Banned By§4]§f: ${by || "§7N/A"}`, `§4[§6Reason§4]§f: ${reason || "§7N/A"}`]);
}

/**
 * Gets the prefix tag of a player, if it exists.
 *
 * @name getPrefix
 * @param {Player} player - The player object
 */
export function getPrefix(player: Player) {
    const tags = player.getTags();
    let customprefix = null;

    for (const tag of tags) {
        if (tag.startsWith("Prefix:")) {
            customprefix = tag.replace("Prefix:", "");
            break;
        }
    }

    config.customcommands.prefix = customprefix || config.customcommands.prefix;
    return config.customcommands.prefix;
}

/**
 * Resets the rank tag of a player by removing any tags starting with "Rank:".
 *
 * @name resetTag
 * @param {Player} member - The other player object
 */
export function resetTag(member: Player) {
    const sanitize = member.getTags();
    for (const tag of sanitize) {
        if (tag.startsWith("Rank:")) {
            member.removeTag(tag);
        }
    }
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${member.name} has reset their rank`);
}

/**
 * Sets a timer for a given player.
 *
 * @param player - A string representing the player for whom the timer is being set.
 * @param spawn - An optional boolean parameter with a default value of `false`.
 * If `spawn` is set to `true`, the timer will be set for 10 seconds;
 * otherwise, it will be set for 2 seconds.
 */
export function setTimer(player: string, spawn: boolean = false) {
    let timer: number = 0;
    if (spawn === true) {
        // Set a timer for 10 seconds
        timer = Date.now() + 10000;
    } else {
        // Set a timer for 2 seconds
        timer = Date.now() + 2000;
    }

    // Store the timer in the map
    timerMap.set(player, timer);
}

/**
 * Checks if the timer for the specified player has expired.
 *
 * @param player - A string representing the player whose timer will be checked.
 * @returns A boolean value indicating whether the timer has expired (`true`) or not (`false`).
 */
export function isTimerExpired(player: string) {
    // Get the timer for the player
    const timer = timerMap.get(player);

    // If the timer doesn't exist, assume it's expired
    if (!timer) {
        return true;
    }

    // Check if the timer has expired
    if (Date.now() > timer) {
        timerMap.delete(player);
        return true;
    }

    return false;
}

/**
 * Get the gamemode of a given player
 * @param player - The player to get the gamemode of
 * @returns The gamemode of the player as a string, or undefined if the player is not found
 */
export function getGamemode(player: Player): string | undefined {
    // Loop through each gamemode in the GameMode enum
    const gamemodeValues = Object.values(GameMode);
    for (const gameMode of gamemodeValues) {
        // Use world.getPlayers() to get an iterator of all players in the world with the same name and game mode as the given player
        const gameModePlayer = world.getPlayers({ name: player.name, gameMode });
        // If a player is found with the given name and game mode, return the corresponding string representation of the gamemode
        if (gameModePlayer.length > 0) {
            switch (gameMode) {
                case GameMode.creative:
                    return "creative";
                case GameMode.survival:
                    return "survival";
                case GameMode.adventure:
                    return "adventure";
                case GameMode.spectator:
                    return "spectator";
            }
        }
    }
    // If no matching player is found, return undefined
    return undefined;
}

/**
 * Sends a message to one or multiple targets in Minecraft.
 *
 * @param targets The target or array of targets to send the messages to.
 * @param message The message to send. This can be a string or an array of strings.
 */
export const sendMsg = async (targets: string | string[], message: string | string[]) => {
    const targetsArray = Array.isArray(targets) ? targets : [targets];
    const isArray = Array.isArray(message);
    const modifiedMessage = isArray ? (message as string[]).map((msg) => msg.replace(/§f/g, "§f§o")) : (message as string).replace(/§f/g, "§f§o");

    // Loop through each target and send the message
    for (const target of targetsArray) {
        overworld.runCommandAsync(`tellraw ${/^ *@[spear]( *\[.*\] *)?$|^ *("[^"]+"|\S+) *$/.test(target) ? target : JSON.stringify(target)} {"rawtext":[{"text":${JSON.stringify(modifiedMessage)}}]}`);
    }
};

/**
 * Sends a message to a player in Minecraft.
 *
 * @param target The player to send the message to.
 * @param message The message to send. This can be a string or an array of strings.
 */
export const sendMsgToPlayer = async (target: Player, message: string | string[]) => {
    const isArray = Array.isArray(message);

    let modifiedMessage: string | string[];

    if (isArray) {
        modifiedMessage = (message as string[]).map((msg) => msg.replace(/§f/g, "§f§o")).join("\n");
    } else {
        modifiedMessage = (message as string).replace(/§f/g, "§f§o");
    }

    target.runCommandAsync(`tellraw @s {"rawtext":[{"text":${JSON.stringify("\n" + modifiedMessage)}}]}`);
};
