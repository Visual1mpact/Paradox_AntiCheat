import { ActionFormData } from "@minecraft/server-ui";
import { Player, EntityInventoryComponent } from "@minecraft/server";
import { uiItemEditorEnchantmentsMenu } from "./uiItemEditorEnchantmentsMenu";
import { uiItemEditorNameMenu } from "./uiInvEditorNameMenu";
import { uiItemEditorReplaceMenu } from "./uiInvEditorReplaceMenu";
import { uiItemEditorTransferMenu } from "./uiInvEditorTransferMenu";
import { uiInvEditorHelpMenu } from "./uiInvEditorHelpMenu";
export function uiInvEditorMenu(player: Player, targetPlayer: Player, itemSlot: number) {
    const menu = new ActionFormData();
    menu.title("§4Paradox - Inventory Item Editor Menu§4");
    const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
    const container = inv.container;
    const item = container.getItem(itemSlot);
    menu.body("§rCurrent Players Inventory: §6" + targetPlayer.name + "\n" + "§rSelected Item: §6" + item.typeId.replace("minecraft:", ""));
    menu.button("Enchantments");
    menu.button("Naming and Lore");
    menu.button("Replace Or Delete Item");
    menu.button("Transfer Item");
    menu.button("Help Menu");
    menu.show(player).then((InvEditorMenuUIResult) => {
        if (InvEditorMenuUIResult.selection == 0) {
            //enchantments
            uiItemEditorEnchantmentsMenu(player, targetPlayer, itemSlot);
        }
        if (InvEditorMenuUIResult.selection == 1) {
            //Naming and Lore
            uiItemEditorNameMenu(player, targetPlayer, itemSlot);
        }
        if (InvEditorMenuUIResult.selection == 2) {
            //Replace Or Delete Item
            uiItemEditorReplaceMenu(player, targetPlayer, itemSlot);
        }
        if (InvEditorMenuUIResult.selection == 3) {
            //Delete or Transfer Item
            uiItemEditorTransferMenu(player, targetPlayer, itemSlot);
        }
        if (InvEditorMenuUIResult.selection == 4) {
            //Show the player the help screen.
            uiInvEditorHelpMenu(player, targetPlayer, itemSlot);
        }
    });
}
