import { TeleportRequestHandler } from "../../command_index";
import { BeforeChatEvent, world, sendMsgToPlayer, paradoxui } from "../../index";

export function uiTPR(requester, player, respons) {
    let member = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(requester.toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Let's complete this tpr request
    if (respons === "yes") {
        const event = {
            sender: player,
            message: "approve",
        } as BeforeChatEvent;
        TeleportRequestHandler(event, ["approve"]);
    }
    if (respons === "no") {
        const event = {
            sender: player,
            message: "denied",
        } as BeforeChatEvent;
        TeleportRequestHandler(event, ["denied"]);
    }
    return paradoxui(player);
}
