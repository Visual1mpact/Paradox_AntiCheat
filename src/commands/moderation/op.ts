import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { EncryptionManager } from "../../classes/EncryptionManager.js";
import { UUIDManager } from "../../classes/UUIDManager.js";

function opHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.op) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }

    const passwordDescription = config.encryption.password ? `§4- §6Use your password to gain Paradox-Op§f` : `§4- §6Give yourself Paradox-Op§f`;
    const commandUsage = config.encryption.password ? `${prefix}op <password>` : `${prefix}op`;

    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: op`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: ${prefix}op [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Grants permission to use Paradox AntiCheat features.`,
        `§4[§6Examples§4]§f:`,
        `    ${commandUsage}`,
        `        ${passwordDescription}`,
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

    if (!operatorHash || !operatorSalt || (operatorHash !== EncryptionManager.hashWithSalt(operatorSalt as string, config.encryption.password || operator.id) && UUIDManager.isValidUUID(operatorSalt as string))) {
        if (!config.encryption.password) {
            if (!operator.isOp()) {
                return sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You need to be Operator to use this command.`);
            }
        }
    }

    // Check if args is null, empty, or for help
    if (args[0]?.toLowerCase() === "help") {
        return opHelp(operator, prefix);
    }

    if (args.length >= 1 && operatorHash === EncryptionManager.hashWithSalt(operatorSalt as string, config.encryption.password || operator.id)) {
        // Operator wants to grant "Paradox-Op" to another player
        const targetPlayerName = args.join(" "); // Combine all arguments into a single string
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
                const targetSalt = UUIDManager.generateRandomUUID();
                targetPlayer.setDynamicProperty("salt", targetSalt);

                // Use either the operator's ID or the encryption password as the key
                const targetKey = config.encryption.password ? config.encryption.password : targetPlayer.id;

                // Generate the hash
                const newHash = EncryptionManager.hashWithSalt(targetSalt, targetKey);

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
            sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f Could not find player ${targetPlayerName}.`);
        }
    } else if (args.length === 0 && !config.encryption.password) {
        // Operator wants to change their own password
        const targetSalt = UUIDManager.generateRandomUUID();

        // Use either the operator's ID or the encryption password as the key
        const key = config.encryption.password ? config.encryption.password : operator.id;

        // Generate the hash
        const newHash = EncryptionManager.hashWithSalt(targetSalt, key);

        operator.setDynamicProperty("hash", newHash);
        operator.setDynamicProperty("salt", targetSalt);
        operator.addTag("paradoxOpped");

        sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You are now Paradox-Opped!`);

        dynamicPropertyRegistry.set(operator.id, operator.name);

        return;
    } else if (args.length === 1 && config.encryption.password) {
        // Allow the user to gain Paradox-Op using the password
        if (config.encryption.password === args[0]) {
            const targetSalt = UUIDManager.generateRandomUUID();

            // Generate the hash using the provided password
            const newHash = EncryptionManager.hashWithSalt(targetSalt, args[0]);

            operator.setDynamicProperty("hash", newHash);
            operator.setDynamicProperty("salt", targetSalt);
            operator.addTag("paradoxOpped");

            sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f You are now Paradox-Opped using the password.`);
            dynamicPropertyRegistry.set(operator.id, operator.name);
        } else {
            // Incorrect password
            sendMsgToPlayer(operator, `§f§4[§6Paradox§4]§f Incorrect password. You need to be Operator to use this command.`);
        }
    } else {
        return opHelp(operator, prefix);
    }
}
