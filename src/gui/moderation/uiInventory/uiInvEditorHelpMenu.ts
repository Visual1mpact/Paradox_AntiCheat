import { ActionFormData } from "@minecraft/server-ui";
import { Player} from "@minecraft/server";
import { uiInvEditorMenu } from "./uiInvEditorMainMenu";
export function uiInvEditorHelpMenu(player: Player, targetPlayer: Player, itemSlot: number) {
    const helpMenu = new ActionFormData();
    helpMenu.title("§4Paradox - Inventory Item Editor Help§4");
    helpMenu.body("§6Enchantments Menu§r\nIn this menu you can add and remove enchantments.\n§6Naming And Lore\n§rThis menu allows you to change the name of the item that is currently selected. The lore can be edited as well you can use colour codes each line is separated via a comma. to clear a lore leave the textbox blank and enable the edit lore toggle.\n§6Replace Or Delete\n§rIn this menu you can replace an item by entering the item name alternatively you can delete it, another option is that providing you have selected an empty inventory slot you can give the player an item by entering the item name.\n§6Transfer Item§r\nThis menu allows you to transfer the selected item to another player, if you want to transfer an item from the target player to your inventory select you name in the drop down. It will check for the next free item slot in your inventory.");
    helpMenu.button("Back");
    helpMenu.show(player).then((InvEditorMenuUIResult) => {
        if (InvEditorMenuUIResult.selection == 0) {
            //Return to the main menu
            uiInvEditorMenu(player, targetPlayer, itemSlot);
        }
      
    });
}
