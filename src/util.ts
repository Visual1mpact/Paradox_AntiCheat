/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, system, Vector, world } from "@minecraft/server";
import config from "./data/config.js";
import { kickablePlayers } from "./kickcheck.js";

/**
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
 * @param {BeforeChatEvent} message - The message object, used to cancel the message.
 */
export async function flag(player: Player, check: string, checkType: string, hackType: string, item: string, stack: number, debugName: string, debug: string, shouldTP: boolean, message: BeforeChatEvent) {
    // Make sure the vl objective exists
    try {
        /**
         * Check if the player has a score for the objective.
         * If they do not then this will catch the error.
         * We handle the objective in the catched error.
         */
        world.scoreboard.getObjective(`${check.toLowerCase()}vl`).getScore(player.scoreboard);
    } catch {
        // Get the objective object in the world then validate if it exists
        const getObjective = world.scoreboard.getObjective(`${check.toLowerCase()}vl`);
        if (!getObjective) {
            // The objective object does not exist so we create it
            world.scoreboard.addObjective(`${check.toLowerCase()}vl`, `${check.toLowerCase()}vl`);
            /**
             * After the objective object is created we now set the score to 0 for the player.
             * This will make the player a participant of this objective so we can safely
             * detect, set, or get their score.
             */
            player.scoreboard.setScore(world.scoreboard.getObjective(`${check.toLowerCase()}vl`), 0);
        } else {
            /**
             * The objective object already exists but the player does not have a score.
             * This means the player is not a participant so we set the score to 0 to add them.
             * The player will now be a participant to that objective object allowing us to now
             * safely detect, set, or get their score.
             */
            player.scoreboard.setScore(world.scoreboard.getObjective(`${check.toLowerCase()}vl`), 0);
        }
    }

    // cancel the message
    if (message) message.cancel = true;

    if (shouldTP && check !== "Crasher") {
        player.teleport(new Vector(player.location.x, player.location.y, player.location.z), player.dimension, 0, 0);
    } else if (shouldTP && check === "Crasher") {
        player.teleport(new Vector(30000000, 30000000, 30000000), player.dimension, 0, 0);
    }

    try {
        setScore(player, `${check.toLowerCase()}vl`, 1, true);
    } catch {}

    try {
        if (debug) {
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
        } else if (item && stack) {
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${item.replace("minecraft:", "")}=${stack})§4. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
        } else {
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} §6has failed §7(${hackType}) §4${check}/${checkType}. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
        }
    } catch {}

    try {
        if (check === "Namespoof") {
            await player.runCommandAsync(`kick ${JSON.stringify(player.name)} §r§4[§6Paradox§4]§r You have illegal characters in your name!`);
        }
    } catch (error) {
        // if we cant kick them with /kick then we instant despawn them
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

/**
 * @name banMessage
 * @param {Player} player - The player object
 */
export async function banMessage(player: Player) {
    let tags = player.getTags();

    let reason: string;
    let by: string;

    // this removes old ban stuff
    for (const tag of tags) {
        if (tag.startsWith("By:")) {
            by = tag.slice(3);
        } else if (tag.startsWith("Reason:")) {
            reason = tag.slice(7);
        }
    }

    try {
        await player.runCommandAsync(`kick ${JSON.stringify(player.name)} §r\n§l§cYOU ARE BANNED!\n§r\n§eBanned By:§r ${by || "N/A"}\n§bReason:§r ${reason || "N/A"}`);
    } catch (error) {
        // if we cant kick them with /kick then we instant despawn them
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

/**
 * @name getScore
 * @param {string} objective - Scoreboard objective
 * @param {Player} player - The player object
 */
//export function getScore(objective: string, player: Player, { minimum, maximum } = { minimum: 0, maximum: 0 }) {
//  try {
//    const data = player.runCommandAsync(`scoreboard players test @s ${objective} ${minimum ? minimum : "*"} ${maximum ? maximum : "*"}`);
//  return parseInt(data.statusMessage.match(/-?\d+/));

//} catch (error) {
//    return undefined;
//}
//}

//provided by VisualImpact
export function getScore(objective: string, player: Player) {
    try {
        return world.scoreboard.getObjective(objective).getScore(player.scoreboard);
    } catch (error) {
        return 0;
    }
}

/**
 * Sets a players score.
 * @name setScore
 * @param {Player} target The player object.
 * @param {string} objective Scoreboard objective.
 * @param {number} amount The number to set it to.
 * @param {boolean} stack If true, it will be added instead of set. Default false.
 * @returns {number} The score it was set to.
 */
export function setScore(target: Player, objective: string, amount: number, stack: boolean = false): number {
    const scoreObj = world.scoreboard.getObjective(objective);
    const score = scoreObj.getScore(target.scoreboard);
    const result = (stack ? score ?? 0 : 0) + amount;
    target.scoreboard.setScore(scoreObj, result);
    return score;
}

/**
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
 * @name tagRank
 * @param {Player} player - The player object
 */
export function tagRank(player: Player) {
    const tags = player.getTags();
    let rank = "Member";
    for (const tag of tags) {
        rank = tag.startsWith("Rank:") ? tag.replace("Rank:", "").replaceAll("--", "§4]§r§4[§6") : rank;
    }
    const nametag = `§4[§6${rank}§4]§r §7${player.name}§r`;
    player.nameTag = nametag;
    const dimension = player.dimension;
    player.teleport(player.location, dimension, 0, 0);
}

/**
 * @name resetTag
 * @param {Player} player - The player object
 * @param {Player} member - The other player object
 */
export function resetTag(player: Player, member: Player) {
    let sanitize = member.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith("Rank:")) {
            member.removeTag(tag);
        }
    }
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${member.nameTag} has reset their rank`);
}

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
export const UUID = (() => {
    const lut = [];
    for (let i = 0; i < 256; i++) {
        lut[i] = (i < 16 ? "0" : "") + i.toString(16);
    }

    return {
        generate: () => {
            const d0 = (Math.random() * 0x100000000) >>> 0;
            const d1 = (Math.random() * 0x100000000) >>> 0;
            const d2 = (Math.random() * 0x100000000) >>> 0;
            const d3 = (Math.random() * 0x100000000) >>> 0;
            return (
                lut[d0 & 0xff] +
                lut[(d0 >> 8) & 0xff] +
                lut[(d0 >> 16) & 0xff] +
                lut[(d0 >> 24) & 0xff] +
                "-" +
                lut[d1 & 0xff] +
                lut[(d1 >> 8) & 0xff] +
                "-" +
                lut[((d1 >> 16) & 0x0f) | 0x40] +
                lut[(d1 >> 24) & 0xff] +
                "-" +
                lut[(d2 & 0x3f) | 0x80] +
                lut[(d2 >> 8) & 0xff] +
                "-" +
                lut[(d2 >> 16) & 0xff] +
                lut[(d2 >> 24) & 0xff] +
                lut[d3 & 0xff] +
                lut[(d3 >> 8) & 0xff] +
                lut[(d3 >> 16) & 0xff] +
                lut[(d3 >> 24) & 0xff]
            );
        },
    };
})();

/**
 * @name toCamelCase
 * @param {string} str - Takes strings and converts to camelCase
 */
export function toCamelCase(str: string) {
    const regExp = /[^a-zA-Z0-9]+(.)/gi;
    return str.replace(regExp, (match) => {
        return match[1].toUpperCase();
    });
}

/**
 * @name titleCase
 * @param {*} s - Takes snakeCase and converts it to titleCase
 * @returns
 */
export const titleCase = (s: string) => s.replace(/^[-_]*(.)/, (_, c) => c.toUpperCase()).replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());

/**
 * @name crypto
 * @param {string} salt - Hashes information
 * @param {string} text - String to be hashed
 */
export const crypto = (salt: string | number | boolean, text: string) => {
    const textToChars = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));
    const byteHex = (n: number) => ("0" + n.toString(16)).substring(-2);
    const applySaltToChar = (code: Uint8Array) => {
        const saltChars = textToChars(String(salt));
        let result = 0;
        for (let i = 0; i < code.length; i++) {
            result ^= saltChars[i % saltChars.length] ^ code[i];
        }
        return result;
    };

    const textChars = textToChars(text);
    const resultChars = new Uint8Array(textChars.length);
    for (let i = 0; i < textChars.length; i++) {
        resultChars[i] = applySaltToChar(textChars.slice(i, i + 1));
    }

    return [...resultChars].map(byteHex).join("");
};

/**
 * @name encryptString
 * @param {string} str - The string to encrypt
 * @param {string} salt - The salt to use for encryption
 * @returns {string} The encrypted string
 */
export function encryptString(str: string, salt: string): string {
    let ciphertext = "";
    let keyIndex = 0;
    for (let i = 0; i < str.length; i++) {
        let plainCharCode = str.charCodeAt(i);
        let keyCharCode = salt.charCodeAt(keyIndex % salt.length);
        let cipherCharCode = (plainCharCode + keyCharCode) % 256; // wrap around at 256
        ciphertext += String.fromCharCode(cipherCharCode);
        keyIndex++;
    }
    return "6f78" + ciphertext;
}

/**
 * @name decryptString
 * @param {string} str - The string to decrypt
 * @param {string} salt - The salt to use for decryption
 * @returns {string} The decrypted string
 */
export function decryptString(str: string, salt: string): string {
    let plaintext = "";
    let keyIndex = 0;
    str = str.slice(4);
    for (let i = 0; i < str.length; i++) {
        let cipherCharCode = str.charCodeAt(i);
        let keyCharCode = salt.charCodeAt(keyIndex % salt.length);
        let plainCharCode = (cipherCharCode - keyCharCode + 256) % 256; // wrap around at 256
        plaintext += String.fromCharCode(plainCharCode);
        keyIndex++;
    }
    return plaintext;
}

const timerMap = new Map();

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

    /**
     * startTimer will make sure the key is properly removed
     * when the time for theVoid has expired. This will preserve
     * the integrity of our Memory.
     */
    const timerExpired = startTimer("util", player, Date.now());
    if (timerExpired.namespace.indexOf("util") !== -1) {
        const deletedKey = timerExpired.key; // extract the key without the namespace prefix
        timerMap.delete(deletedKey);
    }
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

// The Void
const maxAge = 60000; // 1 minute
const checkInterval = 300000; // 5 minutes
const theVoid = new Map();

/**
 * Starts a timer for a given key-value pair in `theVoid` map with a namespace prefix.
 *
 * @param namespace - The namespace prefix to use for the key in `theVoid` map.
 * @param key - The key of the key-value pair in `theVoid` map.
 * @param value - The value of the key-value pair in `theVoid` map, which should be a `Date` object representing the start time of the timer.
 * @returns An object containing the namespace and key that were used to start the timer.
 */
export function startTimer(namespace: string, key: string, value: number): { namespace: string; key: string } {
    const namespacedKey = `${namespace}:${key}`;
    theVoid.set(namespacedKey, value);

    const intervalId = system.runInterval(() => {
        const now = Date.now();
        const timeElapsed = now - theVoid.get(namespacedKey);

        if (timeElapsed > maxAge) {
            const cache = theVoid.get(namespacedKey + ":intervalId");
            theVoid.delete(namespacedKey);
            theVoid.delete(namespacedKey + ":intervalId");
            system.clearRun(cache);
        }
    }, checkInterval);

    theVoid.set(namespacedKey + ":intervalId", intervalId);

    return { namespace, key };
}

const overworld = world.getDimension("overworld");

export const sendMsg = async (target: string, message: string | string[]) => {
    try {
        await overworld.runCommandAsync(`tellraw ${/^ *@[spear]( *\[.*\] *)?$/.test(target) ? target : JSON.stringify(target)} {"rawtext":[{"text":${JSON.stringify(Array.isArray(message) ? message.join("\n\u00a7r") : message)}}]}`);
    } catch {}
};

export const sendMsgToPlayer = async (target: Player, message: string | string[]) => {
    try {
        await target.runCommandAsync(`tellraw @s {"rawtext":[{"text":${JSON.stringify(Array.isArray(message) ? message.join("\n\u00a7r") : message)}}]}`);
    } catch {}
};
