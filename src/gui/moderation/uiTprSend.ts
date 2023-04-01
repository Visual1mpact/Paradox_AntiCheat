import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { getPrefix, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { TeleportRequestHandler } from "../../commands/utility/tpr.js";

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
    //send the request to be teleported based off the player and the member requested.
    const prefix = getPrefix(player);
    const event = {
        sender: player,
        message: prefix + "tpr " + member.name,
        cancel: true,
    } as BeforeChatEvent;
    TeleportRequestHandler(event, [member.name]);

    return paradoxui(player);
}
