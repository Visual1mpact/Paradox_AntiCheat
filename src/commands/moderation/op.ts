import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { crypto, UUID, getPrefix, sendMsg, sendMsgToPlayer, isValidUUID } from "../../util.js";

function opHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.op) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: op`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: op [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Grants permission to use Paradox AntiCheat features.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}op ${player.name}`,
        `    ${prefix}op help`,
    ]);
}

/**
 * @name op
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function op(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/op.js:30)");
    }

    const player = message.sender;

    if (config.modules.encryption.password === "") {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to create a password!`);
    }

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;

    // Validate salt or generate a new one
    if (!salt || !isValidUUID(salt as string)) {
        salt = UUID.generate();
        player.setDynamicProperty("salt", salt);
    }

    // If no hash then create one
    if (hash === undefined && args[0] === config.modules.encryption.password) {
        encode = crypto?.(salt, config?.modules?.encryption?.password);
        dynamicPropertyRegistry.set(player.id, player.name);
        player.setDynamicProperty("hash", encode);
        hash = player.getDynamicProperty("hash");
    } else {
        encode = crypto?.(salt, config?.modules?.encryption?.password);
    }

    // Make sure the user has permissions to run the command
    if (hash === undefined || (hash !== encode && args[0] !== config.modules.encryption.password)) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    } else if (hash === encode && args[0] === config.modules.encryption.password) {
        // Old stuff that makes up for less than 5% of the project
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are now op!`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r is now Paradox-Opped.`);
        player.addTag("paradoxOpped");
        return;
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.op) {
        return opHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return opHelp(player, prefix);
    }

    // try to find the player requested
    let member: Player;
    if (args.length) {
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Check for hash/salt and validate password
    let memberHash = member.getDynamicProperty("hash");
    let memberSalt = member.getDynamicProperty("salt");

    // Validate salt or generate a new one
    if (!memberSalt || !isValidUUID(memberSalt as string)) {
        memberSalt = UUID.generate();
        member.setDynamicProperty("salt", memberSalt);
    }

    // If no hash then create one
    if (memberHash === undefined) {
        encode = crypto(memberSalt, config.modules.encryption.password);
        dynamicPropertyRegistry.set(member.id, member.name);
        member.setDynamicProperty("hash", encode);
        memberHash = member.getDynamicProperty("hash");
    }
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You are now op!`);
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${member.name}§r is now Paradox-Opped.`);
    member.addTag("paradoxOpped");
}
