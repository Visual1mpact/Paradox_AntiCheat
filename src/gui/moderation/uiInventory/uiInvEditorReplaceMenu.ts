import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiItemEditorReplace } from "./uiItemEditor";
export function uiItemEditorReplaceMenu(player: Player, targetPlayer: Player, itemSlot: number) {
    const itemEditor = new ModalFormData();
    itemEditor.title("§4Paradox - Item Editor Replace Item§4");
    itemEditor.toggle("Replace Item", false);
    itemEditor.textField("Item Name", "wooden_sword");
    itemEditor.toggle("Delete Item",false);
    itemEditor.show(player).then((InvEditorUIResult) => {
        uiItemEditorReplace(InvEditorUIResult, player, targetPlayer, itemSlot);
    });
}
