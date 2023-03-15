import { EntityInventoryComponent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
export async function uiPUNISH(punishResult, onlineList, player) {
    const [value] = punishResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use punish.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Make sure they don't punish themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot punish yourself.`);
    }
    //Make sure they don't punish staff!
    if (member.hasTag("paradoxOpped")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot punish Staff.`);
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
            inventory.setItem(i, undefined);
        } catch {}
    }
    // Notify staff and player that punishment has taken place
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You have been punished for your behavior!`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has punished ${member.nameTag}§r`);
    return paradoxui(player);
}
