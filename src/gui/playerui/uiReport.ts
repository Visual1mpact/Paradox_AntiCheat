import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { sendMsg, sendMsgToPlayer } from "../../util";

export function UIREPORTPLAYER(reportplayerResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, reason] = reportplayerResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f !report <player> <reason>§f`);
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
    }

    // Make sure they dont report themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot report yourself.`);
    }

    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Reported ${member.name}§f with reason: ${reason}`);

    sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${player.name}§f has reported ${member.name}§f with reason: ${reason}`);

    return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Your Report has been sent.`);
}
