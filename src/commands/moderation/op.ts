import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { crypto, UUID, getPrefix, sendMsg, sendMsgToPlayer, isValidUUID } from "../../util.js";

function opHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.op) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: op`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: ${prefix}op [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Grants permission to use Paradox AntiCheat features.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}op`,
        `        §4- §6Give yourself Paradox-Op§f`,
        `    ${prefix}op help`,
        `        §4- §6Show command help§f`,
        `    ${prefix}op <player>`,
        `        §4- §6Grant Paradox-Op to another player§f`,
    ]);
}

/**
 * @name op
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function op(message: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/op.js:30)");
    }

    const operator = message.sender;

    const prefix = getPrefix(operator);

    const operatorHash = operator.getDynamicProperty("hash");
    const operatorSalt = operator.getDynamicProperty("salt");

    if (!operatorHash || !operatorSalt || (operatorHash !== crypto?.(operatorSalt, config.encryption.password || operator.id) && isValidUUID(operatorSalt as string))) {
        if (!config.encryption.password || !operator.isOp()) {
            return sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You need to be Operator to use this command.`);
        }
    }

    // Check if args is null, empty, or for help
    if (args[0]?.toLowerCase() === "help") {
        return opHelp(operator, prefix);
    }

    if (args.length === 0) {
        // Operator wants to change their own password
        const targetSalt = UUID.generate();

        // Use either the operator's ID or the encryption password as the key
        const key = config.encryption.password ? config.encryption.password : operator.id;

        // Generate the hash
        const newHash = crypto?.(targetSalt, key);

        operator.setDynamicProperty("hash", newHash);
        operator.setDynamicProperty("salt", targetSalt);
        operator.addTag("paradoxOpped");

        sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You are now Paradox-Opped!`);

        dynamicPropertyRegistry.set(operator.id, operator.name);

        return;
    }

    if (args.length === 1 && args[0].length >= 1 && operatorHash === crypto?.(operatorSalt, operator.id)) {
        // Operator wants to grant "Paradox-Op" to another player
        const targetPlayerName = args[0];
        // Try to find the player requested
        let targetPlayer: Player;
        if (args.length) {
            const players = world.getPlayers();
            for (const pl of players) {
                if (pl.name.toLowerCase().includes(targetPlayerName.toLowerCase().replace(/"|\\|@/g, ""))) {
                    targetPlayer = pl;
                    break;
                }
            }
        }

        if (targetPlayer) {
            const targetHash = targetPlayer.getDynamicProperty("hash");

            if (targetHash === undefined) {
                const targetSalt = UUID.generate();
                targetPlayer.setDynamicProperty("salt", targetSalt);

                // Use either the operator's ID or the encryption password as the key
                const targetKey = config.encryption.password ? config.encryption.password : targetPlayer.id;

                // Generate the hash
                const newHash = crypto?.(targetSalt, targetKey);

                targetPlayer.setDynamicProperty("hash", newHash);

                dynamicPropertyRegistry.set(targetPlayer.id, targetPlayer.name);

                sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You have granted Paradox-Op to ${targetPlayer.name}.`);
                sendMsgToPlayer(targetPlayer, `§f§4[§6Paradox§4]§f You are now op!`);
                sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${targetPlayer.name}§f is now Paradox-Opped.`);
                targetPlayer.addTag("paradoxOpped");
            } else {
                sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f ${targetPlayer.name} is already Paradox-Opped.`);
            }
        } else {
            sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f Could not find player ${targetPlayer.name}.`);
        }
    } else {
        return opHelp(operator, prefix);
    }
}
