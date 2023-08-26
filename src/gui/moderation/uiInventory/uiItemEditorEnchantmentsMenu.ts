import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiItemEditorEnchantments } from "./uiItemEditor";
export function uiItemEditorEnchantmentsMenu(player: Player, targetPlayer: Player, itemSlot: number) {
    const itemEditor = new ModalFormData();
    itemEditor.title("§4Paradox - Item Editor Enchantments§4");
    itemEditor.toggle("Add Enchant", false);
    itemEditor.textField("Enchantment", "knockback");
    itemEditor.textField("Enchantment Value", "3");
    itemEditor.toggle("Remove Enchantment", false);
    itemEditor.textField("Enchantment", "knockback");
    itemEditor.show(player).then((InvEditorUIResult) => {
        uiItemEditorEnchantments(InvEditorUIResult, player, targetPlayer, itemSlot);
    });
}
