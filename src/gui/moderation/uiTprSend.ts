import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiTPRSEND(tprSendRequestResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = tprSendRequestResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }
    //check to see if they already have a pending request.
    if (member.hasTag("RequestPending")) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported ${member.name} to ${player.name}`);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r The requested player already has a pending TP Request!`);
    }
    //give the target the relavent tags
    member.addTag("Requester:" + player.name);
    member.addTag("RequestPending");
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r ${player.name} Has sent a request to be teleported to you. Please check your requests. `);
    return paradoxui(player);
}
