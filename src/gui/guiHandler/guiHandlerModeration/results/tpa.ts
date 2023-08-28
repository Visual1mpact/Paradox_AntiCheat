import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiTPA } from "../../../moderation/uiTpa";

export function tpaHandler(player: Player) {
    const tpaui = new ModalFormData();
    tpaui.title("§4Paradox - Teleport Assistance§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    tpaui.dropdown(`\n§fSelect a player to teleport:§f\n\nPlayer's Online\n`, onlineList);
    tpaui.toggle("Teleport to the target player:", true);
    tpaui.toggle("Teleport the target player to you:", false);
    tpaui
        .show(player)
        .then((tpaResult) => {
            uiTPA(tpaResult, onlineList, player);
        })
        .catch((error) => {
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
