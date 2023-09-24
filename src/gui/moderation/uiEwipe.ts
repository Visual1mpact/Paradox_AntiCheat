import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";

/**
 * Handles the result of a modal form used for wiping ender chests.
 *
 * @name uiEWIPE
 * @param {ModalFormResponse} ewipeResult - The result of the entity wipe modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the entity wipe modal form.
 */
export function uiEWIPE(ewipeResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIEWipe(ewipeResult, onlineList, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleUIEWipe(ewipeResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!ewipeResult || ewipeResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [value] = ewipeResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }

    // Make sure they don't punish themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot wipe yourself.`);
    }
    //Make sure they don't punish staff!
    if (member.hasTag("paradoxOpped")) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot wipe Staff.`);
    }
    // There are 30 slots ranging from 0 to 29
    // Let's clear out that ender chest
    for (let slot = 0; slot < 30; slot++) {
        member.runCommand(`replaceitem entity @s slot.enderchest ${slot} air`);
    }
    // Notify staff and player that punishment has taken place
    sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f Your Enderchest has been wiped!`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f wiped §7${member.name}'s§f enderchest!`);
    return paradoxui(player);
}
