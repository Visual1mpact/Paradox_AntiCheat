/* eslint no-var: "off"*/
import { BeforeChatEvent, EntityInventoryComponent, IEntityComponent, Player, world } from "@minecraft/server";

import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function invseeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.invsee) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: invsee`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: invsee [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Shows the entire inventory of the specified player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}invsee ${player.name}`,
        `    ${prefix}invsee help`,
    ]);
}

// found the inventory viewing scipt in the bedrock addons discord, unsure of the original owner (not my code)
/**
 * @name invsee
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function invsee(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/invsee.js:30)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return invseeHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.invsee) {
        return invseeHelp(player, prefix);
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

    const inv = member.getComponent("inventory") as EntityInventoryComponent;
    const container = inv.container;

    sendMsgToPlayer(player, [
        ` `,
        `§r§4[§6Paradox§4]§r ${member.nameTag}'s inventory:`,
        ...Array.from(Array(container.size), (_a, i) => {
            const item = container.getItem(i);
            return ` | §fSlot ${i}§r §6=>§r ${item ? `§4[§f${item.typeId.replace("minecraft:", "")}§4]§r §6Amount: §4x${item.amount}§r §6=>§r §4[§fData ${item.data}§4]§r` : "§7(empty)"}`;
        }),
        ` `,
    ]);
}
