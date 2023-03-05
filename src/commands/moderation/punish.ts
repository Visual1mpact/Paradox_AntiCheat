/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, ItemStack, MinecraftItemTypes, Player, BeforeChatEvent, EntityInventoryComponent, Items, PlayerInventoryComponentContainer } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;
const empty = new ItemStack(MinecraftItemTypes.acaciaBoat, 0);

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
export async function punish(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/punish.js:10)");
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

    // Was help requested
    const argCheck = args[0];
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
        for (const pl of World.getPlayers()) {
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
            await member.runCommandAsync(`replaceitem entity @s slot.enderchest ${slot} air`);
        } catch (error) {}
    }

    // Get requested player's inventory so we can wipe it out
    const inventoryContainer = member.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const inventory = inventoryContainer.container;

    for (let i = 0; i < inventory.size; i++) {
        const inventory_item = inventory.getItem(i);
        if (!inventory_item) {
            continue;
        }
        try {
            inventory.setItem(i, empty);
        } catch {}
    }
    // Notify staff and player that punishment has taken place
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You have been punished for your behavior!`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    return sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has punished ${member.nameTag}§r`);
}
