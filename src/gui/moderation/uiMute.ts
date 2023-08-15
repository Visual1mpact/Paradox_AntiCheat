import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

/**
 * Handles the result of a modal form used for muting players.
 *
 * @name uiMUTE
 * @param {ModalFormResponse} muteResult - The result of the mute player modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the mute player modal form.
 */
export function uiMUTE(muteResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIMute(muteResult, onlineList, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleUIMute(muteResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, reason] = muteResult.formValues;
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to mute players!.`);
    }

    // Make sure they dont mute themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot mute yourself.`);
    }

    // Make sure staff dont mute staff
    if (member.hasTag("paradoxOpped")) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot mute staff players.`);
    }

    // If not already muted then tag
    if (!member.hasTag("isMuted")) {
        member.addTag("isMuted");
    } else {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f This player is already muted.`);
    }
    // If Education Edition is enabled then legitimately mute them
    member.runCommandAsync(`ability @s mute true`);
    sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You have been muted. Reason: ${reason}`);
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has muted ${member.name}§f. Reason: ${reason}`);
    return paradoxui(player);
}
