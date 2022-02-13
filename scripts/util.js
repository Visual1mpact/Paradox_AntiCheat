/* eslint no-var: "off"*/

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
        player.dimension.runCommand(`scoreboard objectives add ${check.toLowerCase()}vl dummy`);
    } catch(error) {}

    // cancel the message
    if (message) {
        message.cancel = true;
    }

    if (shouldTP && check !== "Crasher") {
        player.dimension.runCommand(`tp "${player.nameTag}" "${player.nameTag}"`);
    } else if (shouldTP && check === "Crasher") {
        player.dimension.runCommand(`tp "${player.nameTag}" 30000000 30000000 30000000`);
    }

    player.dimension.runCommand(`scoreboard players add "${player.nameTag}" ${check.toLowerCase()}vl 1`);

    try {
        if(debug) {
            player.dimension.runCommand(`execute "${player.nameTag}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        } else {
            player.dimension.runCommand(`execute "${player.nameTag}" ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${hackType}) §4${check}/${checkType}. VL= "},{"score":{"name":"@s","objective":"${check.toLowerCase()}vl"}}]}`);
        }
    } catch(error) {}

    if (slot >= 0) {
        try {
            if(slot <= 8) player.dimension.runCommand(`replaceitem entity "${player.nameTag}" slot.hotbar ${slot} air 1`);
                else player.dimension.runCommand(`replaceitem entity "${player.nameTag}" slot.inventory ${slot - 9} air 1`);
        } catch(error) {console.warn(`${new Date()} | ` + error);}
    }

    try {
        if (check === "Namespoof") {
            player.dimension.runCommand(`kick "${player.nameTag}" §r§4[§6Paradox§4]§r Invalid username`);
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
    if (tags) {
        tags = String(tags).split(/[,]/);
    }

    var reason;
    var by;

    // this removes old ban stuff
    tags.forEach(t => {
        if(t.startsWith(" By:")) by = t.slice(4);
        if(t.startsWith(" Reason:")) reason = t.slice(8);
    });

    try {
        player.dimension.runCommand(`kick "${player.nameTag}" §r\n§l§cYOU ARE BANNED!\n§r\n§eBanned By:§r ${by || "N/A"}\n§bReason:§r ${reason || "N/A"}`);
    } catch(error) {
        // if we cant kick them with /kick then we instant despawn them
        player.triggerEvent("paradox:kick");
    }
}

/**
 * @name getTags
 * @param {object} player - The player object
 */
export function getTags(player) {
    // validate that required params are defined
    if (!player) {
        return console.warn(`${new Date()} | ` + "Error: ${player} isnt defined. Did you forget to pass it? (./util.js:110)");
    }

    let tags = player.getTags();

    return String(tags);
}
