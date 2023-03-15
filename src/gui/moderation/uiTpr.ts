import { world } from "@minecraft/server";
import { sendMsgToPlayer } from "../../util";
export function uiTPR(requester, player) {
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
    member.teleport(player.location, player.dimension, 0, 0);
    // Let you know that you have been teleported
    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported ${member.name} to ${player.name}`);
    let playertags = player.getTags();
    let tagtoremove: string;
    playertags.forEach((t) => {
        if (t.startsWith("Requester:")) {
            tagtoremove = t;
        }
    });
    player.removeTag("RequestPending");
    return player.removeTag(tagtoremove);
}
