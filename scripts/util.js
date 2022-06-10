/* eslint no-var: "off"*/
import { Location, Player } from "mojang-minecraft";
import config from "./data/config.js";

/**
 * @name flag
 * @param {object} player - The player object
 * @param {string} check - What check ran the function.
 * @param {string} checktype - What sub-check ran the function (ex. a, b ,c).
 * @param {string} hacktype - What the hack is considered as (ex. movement, combat, exploit).
 * @param {object} item - Item object.
 * @param {object} stack - Item object stack.
 * @param {string} debugName - Name for the debug value.
 * @param {string} debug - Debug info.
 * @param {boolean} shouldTP - Whever to tp the player to itself.
 * @param {object} message - The message object, used to cancel the message.
 * @param {number} slot - Slot to clear an item out.
 */
export function flag(player, check, checkType, hackType, item, stack, debugName, debug, shouldTP, message) {
    // validate that required params are defined
    if (!player) {
        return console.warn(`${new Date()} | ` + "Error: ${player} isnt defined. Did you forget to pass it? (./util.js:8)");
    }
    if (!check) {
        return console.warn(`${new Date()} | ` + "Error: ${check} isnt defined. Did you forget to pass it? (./util.js:9)");
    }
    if (!check) {
        return console.warn(`${new Date()} | ` + "Error: ${checkType} isnt defined. Did you forget to pass it? (./util.js:10)");
    }
    if (!hackType) {
        return console.warn(`${new Date()} | ` + "Error: ${hackType} isnt defined. Did you forget to pass it? (./util.js:11)");
    }

    // make sure the vl objective exists
    try {
        player.runCommand(`scoreboard objectives add ${check.toLowerCase()}vl dummy`);
    } catch(error) {}

    // cancel the message
    if (message) {
        message.cancel = true;
    }

    if (shouldTP && check !== "Crasher") {
        player.teleport(new Location(player.location.x, player.location.y, player.location.z), player.dimension, 0, 0);
    } else if (shouldTP && check === "Crasher") {
        player.teleport(new Location(30000000, 30000000, 30000000), player.dimension, 0, 0);
    }

    try {
        player.runCommand(`scoreboard players add "${disabler(player.nameTag)}" ${check.toLowerCase()}vl 1`);
    } catch(error) {}

    try {
        if(debug) {
            player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        } else if (item && stack) {
            player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has failed §7(${hackType}) §4${check}/${checkType} §7(${item.replace('minecraft:', "")}=${stack})§4. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        } else {
            player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has failed §7(${hackType}) §4${check}/${checkType} VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        }
    } catch(error) {}

    try {
        if (check === "Namespoof") {
            player.runCommand(`kick "${disabler(player.nameTag)}" §r§4[§6Paradox§4]§r Please use your real xbl name!`);
        }
    } catch(error) {
        // if we cant kick them with /kick then we instant despawn them
        player.triggerEvent("paradox:kick");
    }
}

/**
 * @name banMessage
 * @param {object} player - The player object
 */
export function banMessage(player) {
    // validate that required params are defined
    if (!player) {
        return console.warn(`${new Date()} | ` + "Error: ${player} isnt defined. Did you forget to pass it? (./util.js:78)");
    }

    let tags = player.getTags();

    var reason;
    var by;

    // this removes old ban stuff
    tags.forEach(t => {
        if(t.startsWith("By:")) by = t.slice(3);
        if(t.startsWith("Reason:")) reason = t.slice(7);
    });

    try {
        player.runCommand(`kick "${disabler(player.nameTag)}" §r\n§l§cYOU ARE BANNED!\n§r\n§eBanned By:§r ${by || "N/A"}\n§bReason:§r ${reason || "N/A"}`);
    } catch(error) {
        // if we cant kick them with /kick then we instant despawn them
        player.triggerEvent("paradox:kick");
    }
}

/**
 * @name getScore
 * @param {string} objective - Scoreboard objective
 * @param {object} player - The player object
 * @param {number} minimum - Minimum score
 * @param {number} maximum - Maximum score
 */
export function getScore(objective, player, { minimum, maximum } = {}) {
    try {
        const data = player.runCommand(`scoreboard players test "${disabler(player.nameTag)}" ${objective} ${minimum ? minimum : "*"} ${maximum ? maximum : "*"}`);
        return parseInt(data.statusMessage.match(/-?\d+/));
    } catch (error) {
        return;
    }
}

/**
 * @name disabler
 * @param {object} player - The player object
 */
export function disabler(player) {
    // fix a disabler method
    return player.replace(/(\\|")/g, "");
}

/**
 * @name getPrefix
 * @param {object} player - The player object
 */
 export function getPrefix(player) {
    let customprefix;
    let sanitize = player.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith('Prefix:')) {
            customprefix = tag.replace('Prefix:', '');
            return config.customcommands.prefix = customprefix;
        }
    }
    if (!customprefix) {
        return config.customcommands.prefix = "!";
    }
}

/**
 * @name tagRank
 * @param {object} player - The player object
 */
export function tagRank(player) {
    let tags = player.getTags();
    let rank;
    for (const tag of tags) {
        if (tag.startsWith('Rank:')) {
            rank = tag.replace('Rank:', '');
            rank = rank.replaceAll('--', '§4]§r§4[§6');
        }
    }
    if (!rank) {
        rank = "Member";
    }
    let nametag = `§4[§6${rank}§4]§r §7${player.name}§r`;
    player.nameTag = nametag;
    const dimension = player.dimension;
    // This refreshes the nameTag in the World
    player.teleport(new Location(player.location.x, player.location.y, player.location.z), dimension, 0, 0);
}

/**
 * @name resetTag
 * @param {object} player - The player object
 * @param {object} member - The other player object
 */
export function resetTag(player, member) {
    let sanitize = member.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith('Rank:')) {
            member.removeTag(tag);
        }
    }
    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)} has reset their rank"}]}`);
}

/**
 * @name generateUUID
 */
export function generateUUID() {
    // timestamp
    var d = new Date().getTime();
    // Time in microseconds since tick or 0 if unsupported
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        // random number between 0 and 16
        var r = Math.random() * 16;
        // Use timestamp until depleted
        if(d > 0){
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {
            // Use microseconds since tick if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * @name toCamelCase
 * @param {string} str - Takes strings and converts to camelCase
 */
export function toCamelCase(str){
    const regExp = /[^a-zA-Z0-9]+(.)/ig;
    return str.replace(regExp,(match) => {
        return match[1].toUpperCase();
    });
}

/**
 * @name titleCase
 * @param {*} s - Takes snakeCase and converts it to titleCase
 * @returns 
 */
export const titleCase = (s) =>
  s.replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())
   .replace (/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase());

// Handler for encryption down below
const { encryption } = config.modules;

/**
 * @name crypto
 * @param {string} salt - Hashes information
 * @param {string} text - String to be hashed
 */
 export const crypto = (salt, text) => {
    const textToChars = (text) => text.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n) => ("0" + Number(n).toString(16)).substring(-2);
    const applySaltToChar = (code) => textToChars(salt).reduce((a, b) => a ^ b, code);

    return text
        .split("")
        .map(textToChars)
        .map(applySaltToChar)
        .map(byteHex)
        .join("");
}
