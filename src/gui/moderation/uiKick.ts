import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiKICK(banResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, reason] = banResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
        return paradoxui(player);
    }

    // make sure they dont kick themselves
    if (member === player) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot kick yourself.`);
        return paradoxui(player);
    }

    try {
        await player.runCommandAsync(`kick ${member.id} §r\n\n${reason}`);
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to kick that player! Error: ${error}`);
    }
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has kicked ${member.name}§r. Reason: ${reason}`);
    return paradoxui(player);
}
