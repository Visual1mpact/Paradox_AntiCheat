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
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
        return paradoxui(player);
    }

    // make sure they dont kick themselves
    if (member === player) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot kick yourself.`);
        return paradoxui(player);
    }

    player.runCommandAsync(`kick ${member.name} §f\n\n${reason}`).catch((error) => {
        console.warn(`${new Date()} | ` + error);
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f I was unable to kick that player!`);
    });
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has kicked ${member.name}§f. Reason: ${reason}`);
    return paradoxui(player);
}
