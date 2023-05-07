import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
export async function uiEWIPE(ewipeResult, onlineList, player) {
    const [value] = ewipeResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (let pl of players) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Make sure they don't punish themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot wipe yourself.`);
    }
    //Make sure they don't punish staff!
    if (member.hasTag("paradoxOpped")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot wipe Staff.`);
    }
    // There are 30 slots ranging from 0 to 29
    // Let's clear out that ender chest
    for (let slot = 0; slot < 30; slot++) {
        try {
            await member.runCommandAsync(`replaceitem entity @s slot.enderchest ${slot} air`);
        } catch (error) {}
    }
    // Notify staff and player that punishment has taken place
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r Your Enderchest has been wiped!`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r Wiped ${member.nameTag}'s enderchest!`);
    return paradoxui(player);
}
