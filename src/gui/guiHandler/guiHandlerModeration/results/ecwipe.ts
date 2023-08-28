import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiEWIPE } from "../../../moderation/uiEwipe";

export function ecwipeHandler(player: Player) {
    const ewipeui = new ModalFormData();
    ewipeui.title("§4Paradox - Wipe A Player's Enderchest§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    ewipeui.dropdown(`\n§fSelect a player to wipe their Enderchest:§f\n\nPlayer's Online\n`, onlineList);
    ewipeui
        .show(player)
        .then((ewipeResult) => {
            uiEWIPE(ewipeResult, onlineList, player);
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
