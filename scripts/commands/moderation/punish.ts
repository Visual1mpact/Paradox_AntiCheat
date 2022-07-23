/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, ItemStack, MinecraftItemTypes, Player, BeforeChatEvent, EntityInventoryComponent } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function punishHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.punish) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: punish`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: punish [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Removes all items from the player's inventory and ender chest.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}punish ${player.name}`,
        `    ${prefix}punish help`,
    ]);
}

/**
 * @name punish
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function punish(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/punish.js:10)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.punish) {
        return punishHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return punishHelp(player, prefix);
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

    // Make sure they don't punish themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot punish yourself.`);
    }

    // There are 30 slots ranging from 0 to 29
    // Let's clear out that ender chest
    for (let slot = 0; slot < 30; slot++) {
        try {
            member.runCommand(`replaceitem entity @s slot.enderchest ${slot} air`);
        } catch (error) {}
    }

    // Get requested player's inventory so we can wipe it out
    let inventoryContainer = member.getComponent("minecraft:inventory") as EntityInventoryComponent;
    let inventory = inventoryContainer.container;
    for (let i = 0; i < inventory.size; i++) {
        let inventory_item = inventory.getItem(i);
        if (!inventory_item) {
            continue;
        }
        try {
            inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 1));
        } catch {}
    }
    // Notify staff and player that punishment has taken place
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You have been punished for your behavior!`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    return sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has punished ${member.nameTag}§r`);
}
