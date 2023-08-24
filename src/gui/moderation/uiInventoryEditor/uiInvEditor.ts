import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiItemEditor } from "./uiItemEditor";
export function uiINVEDITOR(player: Player, itemSlot: number) {
    const itemEditor = new ModalFormData();
    itemEditor.title("§4Paradox - Inventory Item Editor§4");
    itemEditor.toggle("Delete Item", false);
    itemEditor.toggle("Rename Item", false);
    itemEditor.textField("Name", "MyCoolItem");
    itemEditor.toggle("Replace Item", false);
    itemEditor.textField("Item Name", "wooden_sword");
    itemEditor.toggle("Add Enchant", false);
    itemEditor.textField("Enchantment", "knockback");
    itemEditor.textField("Enchantment Value", "3");
    itemEditor.toggle("Transfer Item");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    itemEditor.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlineList);
    itemEditor.show(player).then((InvEditorUIResult) => {
        uiItemEditor(InvEditorUIResult, onlineList, player, itemSlot);
    });
}
