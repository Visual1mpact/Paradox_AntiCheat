import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { resetTag, getPrefix, crypto, sendMsgToPlayer, sendMsg } from "../../util.js";

const World = world;

function tagHelp(player: Player, prefix: string, chatRanksBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.tag || !config.customcommands.chatranks) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (chatRanksBoolean === false || !config.customcommands.chatranks) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: tag`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: tag <username> [optional]`,
        `§4[§6Optional§4]§r: Rank:tag, Rank:tag--tag, reset, help`,
        `§4[§6Description§4]§r: Gives one or more ranks to a specified player or resets it.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tag ${player.name} Rank:Admin`,
        `    ${prefix}tag ${player.name} Rank:Contributor--Mod`,
        `    ${prefix}tag ${player.name} Rank:Staff--Mod--Helper`,
        `    ${prefix}tag help`,
    ]);
}

/**
 * @name tag
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function tag(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/tag.js:37)");
    }

    message.cancel = true;

    const player = message.sender;

    // fixes a bug that kills !tag when using custom names
    player.nameTag = player.name;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return tagHelp(player, prefix, chatRanksBoolean);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.tag || !chatRanksBoolean || !config.customcommands.chatranks) {
        return tagHelp(player, prefix, chatRanksBoolean);
    }

    // try to find the player requested
    let member: Player;
    for (const pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // check if array contains the string 'reset'
    const argcheck = args.includes("reset");

    // reset rank
    if (argcheck === true) {
        resetTag(player, member);
        // tagRank(member);
        return;
    }

    let custom: string;
    args.forEach((t) => {
        if (t.startsWith("Rank:")) {
            custom = t;
        }
    });
    if (custom.startsWith("Rank:")) {
        resetTag(player, member);
        member.addTag(`${custom}`);
        // tagRank(member);
    } else {
        return tagHelp(player, prefix, chatRanksBoolean);
    }

    if (player === member) {
        return sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has changed their rank`);
    }

    sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has changed ${member.nameTag}'s rank!`);
}
