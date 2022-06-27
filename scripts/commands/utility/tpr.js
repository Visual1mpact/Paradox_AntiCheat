/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

let cooldownTimer = new WeakMap();

function dhms (ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const daysms = ms % (24*60*60*1000);
    const hours = Math.floor(daysms / (60*60*1000));
    const hoursms = ms % (60*60*1000);
    const minutes = Math.floor(hoursms / (60*1000));
    const minutesms = ms % (60*1000);
    const sec = Math.floor(minutesms / 1000);
    if (days !== 0) {
        return days + " Days : " + hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (hours !== 0) {
        return hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (minutes !== 0) {
        return minutes + " Minutes : " + sec + " Seconds";
    }
    if (sec !== 0) {
        return sec + " Seconds";
    }
}

function tprHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.tpr) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: tpr`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: tpr [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Sends a request to teleport to a player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tpr ${player.name}`,
        `    ${prefix}tpr help`,
    ]);
}

/**
 * @name tpr
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function tpr(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/tpr.js:54)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tpr) {
        return tprHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return tprHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    /**
     * You cannot request yourself
     */
    if (player.name === member.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot send a teleport request to yourself! Try again.`);
    }

    /**
     * If the requestee already has a pending request then cancel it.
     * Only one request per person is authorized at any given time.
     */
    if (member.hasTag('tpr')) {
        /**
         * Check if timer has expired for past pending requests.
         * If timer has expired then we will clear the requester and requestee
         * to allow a request be sent and recieved.
         */
        let cooldownCalc;
        let activeTimer;
        // Get original time in milliseconds
        let cooldownVerify = cooldownTimer.get(member);
        // Convert config settings to milliseconds so we can be sure the countdown is accurate
        let msSettings = (config.modules.tpr.days * 24 * 60 * 60 * 1000) + (config.modules.tpr.hours * 60 * 60 * 1000) + (config.modules.tpr.minutes * 60 * 1000) + (config.modules.tpr.seconds * 1000);
        if (cooldownVerify !== undefined) {
            // Determine difference between new and original times in milliseconds
            let bigBrain = new Date().getTime() - cooldownVerify;
            // Subtract realtime clock from countdown in configuration to get difference
            cooldownCalc = msSettings - bigBrain;
            // Convert difference to clock format D : H : M : S
            activeTimer = dhms(cooldownCalc);
        } else {
            // First time executed so we default to configuration in milliseconds
            cooldownCalc = msSettings;
        }
        // If timer doesn't exist or has expired then grant permission to teleport and set the countdown
        if (cooldownCalc === msSettings || cooldownCalc <= 0) {
            // Delete old key and value
            cooldownTimer.delete(member);
            // Create new key and value with current time in milliseconds
            cooldownTimer.set(member, new Date().getTime());
            // Set up the request
            if (!player.hasTag('tpr:' + member.name)) {
                player.addTag('tpr:' + member.name);
            }
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Hello ${player.name}! Your teleport request has been sent to ${member.name}.`);
            return sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r Hello ${member.name}! ${player.name} is requesting to teleport to your location! Type yes or no.`);
        } else {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r ${member.name} is pending a request. Try again later.`);
        }
    } else {
        member.addTag('tpr');
        player.addTag('tpr:' + member.name);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Hello ${player.name}! Your teleport request has been sent to ${member.name}.`);
        return sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r Hello ${member.name}! ${player.name} is requesting to teleport to your location! Type yes or no.`);
    }
}
