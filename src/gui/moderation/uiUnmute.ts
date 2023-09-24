import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

/**
 * Handles the result of a modal form used for unmuting players.
 *
 * @name uiUNMUTE
 * @param {ModalFormResponse} muteResult - The result of the player unmute modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the player unmute modal form.
 */
export function uiUNMUTE(muteResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIUnmute(muteResult, onlineList, player).catch((error) => {
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

async function handleUIUnmute(muteResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!muteResult || muteResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
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

    // If muted then un tag
    if (member.hasTag("isMuted")) {
        member.removeTag("isMuted");
    } else {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f This player is already unmuted.`);
    }
    // If Education Edition is enabled then legitimately unmute them
    member.runCommandAsync(`ability @s mute false`);
    sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You have been unmuted. Reason: §7${reason}§f`);
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has unmuted §7${member.name}§f. Reason: §7${reason}§f`);
    return paradoxui(player);
}
