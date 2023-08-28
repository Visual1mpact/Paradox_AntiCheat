import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiPREFIX } from "../../moderation/uiPrefix";

export function prefixHandler(player: Player) {
    //Prefix ui
    const prefixui = new ModalFormData();
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    prefixui.title("§4Paradox - Change command prefix§4");
    prefixui.dropdown(`\nChanges prefix used for commands:\n\nPlayer's Online\n`, onlineList);
    prefixui.textField(`\nPrefix:\n`, `Put new prefix here`, null);
    prefixui.toggle(`\nReset Prefix:`, false);
    prefixui
        .show(player)
        .then((prefixResult) => {
            //Prefix logic
            uiPREFIX(prefixResult, onlineList, player);
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
