import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { TeleportRequestHandler } from "../../commands/utility/tpr";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui";
export function uiTPR(requester: string, player: Player, respons: string) {
    let member = undefined;
    const players = world.getPlayers();
    for (let pl of players) {
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
            cancel: true,
        } as BeforeChatEvent;
        TeleportRequestHandler(event, ["approve"]);
    }
    if (respons === "no") {
        const event = {
            sender: player,
            message: "denied",
            cancel: true,
        } as BeforeChatEvent;
        TeleportRequestHandler(event, ["denied"]);
    }
    return paradoxui(player);
}
