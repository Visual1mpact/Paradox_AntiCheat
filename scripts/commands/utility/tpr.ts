/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

export let cooldownTimer = new WeakMap();

function tprHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.tpr) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: tpr`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: tpr [optional]`,
        `§4[§6Optional§4]§r: username, block, unblock, help`,
        `§4[§6Description§4]§r: Sends a request to teleport to a player or blocks/unblocks requests.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tpr ${player.name}`,
        `    ${prefix}tpr block`,
        `    ${prefix}tpr unblock`,
        `    ${prefix}tpr help`,
    ]);
}

/**
 * @name tpr
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function tpr(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/tpr.js:56)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return tprHelp(player, prefix);
    }

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tpr) {
        return tprHelp(player, prefix);
    }

    /**
     * Verify if they are blocking all future
     * requests or unblocking all future requests
     */
    if (argCheck && args[0].toLowerCase() === "block") {
        player.addTag('tprblock');
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have blocked all future teleport requests!`);
    } else if (argCheck && args[0].toLowerCase() === "unblock") {
        player.removeTag('tprblock');
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have unblocked all future teleport requests!`);
    }

    // Try to find the player requested
    let member: Player;
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

    // If they block requests then cancel the request
    if (member.hasTag('tprblock')) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This player has all teleport requests blocked!`);
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
        let cooldownCalc: number;
        // Get original time in milliseconds
        let cooldownVerify = cooldownTimer.get(member);
        // Convert config settings to milliseconds so we can be sure the countdown is accurate
        let msSettings = (config.modules.tpr.days * 24 * 60 * 60 * 1000) + (config.modules.tpr.hours * 60 * 60 * 1000) + (config.modules.tpr.minutes * 60 * 1000) + (config.modules.tpr.seconds * 1000);
        if (cooldownVerify !== undefined) {
            // Determine difference between new and original times in milliseconds
            let bigBrain = new Date().getTime() - cooldownVerify;
            // Subtract realtime clock from countdown in configuration to get difference
            cooldownCalc = msSettings - bigBrain;
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
