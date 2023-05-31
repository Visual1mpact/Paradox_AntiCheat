import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { resetTag, getPrefix, sendMsgToPlayer, sendMsg } from "../../util.js";

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
        `§4[§6Optional§4]§r: rank, rank--rank, reset, help`,
        `§4[§6Description§4]§r: Gives one or more ranks to a specified player or resets it.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tag ${player.name} Admin`,
        `    ${prefix}tag ${player.name} Contributor--Mod`,
        `    ${prefix}tag ${player.name} Staff--Mod--Helper`,
        `    ${prefix}tag help`,
    ]);
}

/**
 * @name tag
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function tag(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/tag.js:37)");
    }

    const player = message.sender;

    // fixes a bug that kills !tag when using custom names
    player.nameTag = player.name;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
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
    const argCheck = args[0].toLowerCase();
    if (argCheck === "help" || !config.customcommands.tag || !chatRanksBoolean || !config.customcommands.chatranks) {
        return tagHelp(player, prefix, chatRanksBoolean);
    }

    const playerName = args.slice(0, -1).join(" "); // Combine all arguments except the last one as the player name
    const rank = args[args.length - 1]; // Last argument is the rank

    // try to find the player requested
    let member: Player;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(playerName.toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // check if array contains the string 'reset'
    const argcheck = args[1].toLowerCase();

    // reset rank
    if (argcheck === "reset") {
        resetTag(member);
        return;
    }

    // Add new rank if command is utilize correctly
    if (args.length >= 2) {
        const newRank = "Rank:" + rank;
        resetTag(member);
        member.addTag(newRank);
    } else {
        return tagHelp(player, prefix, chatRanksBoolean);
    }

    if (player === member) {
        return sendMsg("@a[tag=paradoxOpped]", `${player.name} has changed their rank`);
    }

    sendMsg("@a[tag=paradoxOpped]", `${player.name} has changed ${member.name}'s rank!`);
}
