import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { getPrefix, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { TeleportRequestHandler } from "../../commands/utility/tpr.js";

export function uiTPRSEND(tprSendRequestResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = tprSendRequestResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
    }
    //send the request to be teleported based off the player and the member requested.
    const prefix = getPrefix(player);
    const event = {
        sender: player,
        message: prefix + "tpr " + member.name,
    } as ChatSendAfterEvent;
    TeleportRequestHandler(event, [member.name]);

    return paradoxui(player);
}
