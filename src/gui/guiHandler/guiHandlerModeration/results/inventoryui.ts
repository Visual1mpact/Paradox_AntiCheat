import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiINVENTORY } from "../../../moderation/uiInventory";
export function inventoryHandler(player: Player) {
    const inventoryUI = new ModalFormData();
    inventoryUI.title("§4Paradox - Inventory Management§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    inventoryUI.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlineList);
    inventoryUI
        .show(player)
        .then((inventoryUIResult) => {
            uiINVENTORY(inventoryUIResult, onlineList, player);
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
