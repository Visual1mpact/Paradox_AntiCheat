/* eslint no-var: "off"*/
import { BeforeChatEvent, Location, Player, world } from "@minecraft/server";
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
    // make sure the vl objective exists
    if (!world.scoreboard.getObjective(`${check.toLowerCase()}vl`)) {
        world.scoreboard.addObjective(`${check.toLowerCase()}vl`, `${check.toLowerCase()}vl`).setScore(player.scoreboard, 0);
    }

    // cancel the message
    if (message) message.cancel = true;

    if (shouldTP && check !== "Crasher") {
        player.teleport(new Location(player.location.x, player.location.y, player.location.z), player.dimension, 0, 0);
    } else if (shouldTP && check === "Crasher") {
        player.teleport(new Location(30000000, 30000000, 30000000), player.dimension, 0, 0);
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

    var reason: string;
    var by: string;

    // this removes old ban stuff
    tags.forEach((t) => {
        if (t.startsWith("By:")) by = t.slice(3);
        if (t.startsWith("Reason:")) reason = t.slice(7);
    });

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
    let customprefix: string;
    let sanitize = player.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith("Prefix:")) {
            customprefix = tag.replace("Prefix:", "");
            return (config.customcommands.prefix = customprefix);
        }
    }
    return config.customcommands.prefix;
}

/**
 * @name tagRank
 * @param {Player} player - The player object
 */
export function tagRank(player: Player) {
    let tags = player.getTags();
    let rank: string;
    for (const tag of tags) {
        if (tag.startsWith("Rank:")) {
            rank = tag.replace("Rank:", "");
            rank = rank.replaceAll("--", "§4]§r§4[§6");
        }
    }
    if (!rank) {
        rank = "Member";
    }
    let nametag = `§4[§6${rank}§4]§r §7${player.name}§r`;
    player.nameTag = nametag;
    const dimension = player.dimension;
    // This refreshes the nameTag in the World
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
export const UUID = (function () {
    const self = { generate: this };
    const lut = [];
    for (var i = 0; i < 256; i++) {
        lut[i] = (i < 16 ? "0" : "") + i.toString(16);
    }
    self.generate = function () {
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
    };
    return self;
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
    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + n.toString(16)).substring(-2);
    const applySaltToChar = (code: number[]) => textToChars(String(salt)).reduce((a: number, b: number) => a ^ b, Number(code));

    return text.split("").map(textToChars).map(applySaltToChar).map(byteHex).join("");
};

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
