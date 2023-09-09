import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { EncryptionManager } from "../../classes/EncryptionManager.js";

function deopHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.deop) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: deop`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: deop [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Revokes permission to use Paradox AntiCheat features.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}deop ${player.name}`,
        `        §4- §6Revoke Paradox-Op permission from players§f`,
        `    ${prefix}deop help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name deop
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function deop(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/op.js:30)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.deop) {
        return deopHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return deopHelp(player, prefix);
    }

    // try to find the player requested
    let member: Player;
    if (args.length) {
        const targetPlayerName = args.join(" "); // Combine all arguments into a single string
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(targetPlayerName.toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }

    // Check for hash/salt and validate password from member
    const memberHash = member.getDynamicProperty("hash");
    const memberSalt = member.getDynamicProperty("salt");
    let memberEncode: string;
    try {
        // Use either the operator's ID or the encryption password as the key
        const memberKey = config.encryption.password ? config.encryption.password : member.id;

        // Generate the hash
        memberEncode = EncryptionManager.hashWithSalt(memberSalt as string, memberKey);
    } catch (error) {}

    if (memberEncode && memberHash !== undefined && memberHash === memberEncode) {
        member.removeDynamicProperty("hash");
        member.removeDynamicProperty("salt");
        member.removeTag("paradoxOpped");
        dynamicPropertyRegistry.delete(member.id);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${member.name} is no longer Paradox-Opped.`);
        return sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f Your OP status has been revoked!`);
    }
    return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f ${member.name} never had permission to use Paradox.`);
}
