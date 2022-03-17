/* eslint no-var: "off"*/
import { Location, world } from "mojang-minecraft";
import config from "./data/config.js";

/**
 * @name flag
 * @param {object} player - The player object
 * @param {string} check - What check ran the function.
 * @param {string} checktype - What sub-check ran the function (ex. a, b ,c).
 * @param {string} hacktype - What the hack is considered as (ex. movement, combat, exploit).
 * @param {string} debugName - Name for the debug value.
 * @param {string} debug - Debug info.
 * @param {boolean} shouldTP - Whever to tp the player to itself.
 * @param {object} message - The message object, used to cancel the message.
 * @param {number} slot - Slot to clear an item out.
 */
export function flag(player, check, checkType, hackType, debugName, debug, shouldTP, message, slot) {
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
        player.runCommand(`tp "${disabler(player.nameTag)}" "${disabler(player.nameTag)}"`);
    } else if (shouldTP && check === "Crasher") {
        player.runCommand(`tp "${disabler(player.nameTag)}" 30000000 30000000 30000000`);
    }

    player.runCommand(`scoreboard players add "${disabler(player.nameTag)}" ${check.toLowerCase()}vl 1`);

    try {
        if(debug) {
            player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        } else {
            player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${hackType}) §4${check}/${checkType}. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        }
    } catch(error) {}

    if (slot >= 0) {
        try {
            if(slot <= 8) player.runCommand(`replaceitem entity "${disabler(player.nameTag)}" slot.hotbar ${slot} air 1`);
                else player.runCommand(`replaceitem entity "${disabler(player.nameTag)}" slot.inventory ${slot - 9} air 1`);
        } catch(error) {console.warn(`${new Date()} | ` + error);}
    }

    try {
        if (check === "Namespoof") {
            player.runCommand(`kick "${disabler(player.nameTag)}" §r§4[§6Paradox§4]§r Invalid username`);
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
    player = player.replace("\"", "");
    return player = player.replace("\\", "");
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
    player.teleport(new Location(player.location.x, player.location.y, player.location.z), dimension, 0, player.bodyRotation);
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
