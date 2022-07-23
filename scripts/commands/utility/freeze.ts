/* eslint no-var: "off"*/
import { world, MinecraftEffectTypes, Player, BeforeChatEvent } from "mojang-minecraft";
import config from "../../data/config.js";
import { TickFreeze } from "../../penrose/tickevent/freeze/freeze.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function freezeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.freeze) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: freeze`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: freeze [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Will freeze or unfreeze the specified player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}freeze ${player.name}`,
        `    ${prefix}freeze help`,
    ]);
}

/**
 * @name freeze
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function freeze(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/freeze.js:30)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return freezeHelp(player, prefix);
    }

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.freeze) {
        return freezeHelp(player, prefix);
    }
    
    // try to find the player requested
    let member: Player;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }
    
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Check for hash/salt and validate password
    let memberHash = member.getDynamicProperty('hash');
    let memberSalt = member.getDynamicProperty('salt');
    let memberEncode;
    try {
        memberEncode = crypto(memberSalt, config.modules.encryption.password);
    } catch (error) {}

    if (memberHash !== undefined && memberEncode === memberHash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot freeze staff members.`);
    }

    if (member.hasTag('freeze')) {
        member.addTag('nofreeze');
    }
    if (member.hasTag('nofreeze')) {
        member.removeTag('freeze');
    }
    if (member.hasTag('nofreeze')) {
        member.runCommand(`effect @s clear`);
        sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You are no longer frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.nameTag}§r is no longer frozen.`);
    }

    if (!member.hasTag('nofreeze')) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.blindness, 1000000, 255);
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.miningFatigue, 1000000, 255);
        // Weakness
        member.addEffect(MinecraftEffectTypes.weakness, 1000000, 255);
        // Slowness
        member.addEffect(MinecraftEffectTypes.slowness, 1000000, 255);
    }

    if (!member.hasTag('nofreeze')) {
        member.addTag('freeze');
        sendMsg(`@a[tag=paradoxOpped]`, `${member.nameTag}§r is now frozen.`);
        return TickFreeze(member);
    }

    if (member.hasTag('nofreeze')) {
        member.removeTag('nofreeze');
        return TickFreeze(member);
    }
}
