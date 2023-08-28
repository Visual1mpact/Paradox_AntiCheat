import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiItemEditorName } from "./uiItemEditor";
export function uiItemEditorNameMenu(player: Player, targetPlayer: Player, itemSlot: number) {
    const itemEditor = new ModalFormData();
    itemEditor.title("§4Paradox - Item Editor Name&Lore§4");
    itemEditor.toggle("Rename Item", false);
    itemEditor.textField("Name", "MyCoolItem");
    itemEditor.toggle("Edit Lore", false);
    itemEditor.textField("Lore", "Lore1,Lore2,Lore3");
    itemEditor
        .show(player)
        .then((InvEditorUIResult) => {
            uiItemEditorName(InvEditorUIResult, player, targetPlayer, itemSlot);
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
