import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiFREEZE } from "../../../moderation/uiFreeze";

export function freezeHandler(player: Player) {
    const freezeui = new ModalFormData();
    freezeui.title("§4Paradox - Freeze A Player.§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    freezeui.dropdown(`\n§fSelect a player to freeze:§f\n\nPlayer's Online\n`, onlineList);
    freezeui
        .show(player)
        .then((freezeResult) => {
            uiFREEZE(freezeResult, onlineList, player);
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
