import { EntityInventoryComponent, Player, world, ItemStack, Enchantment, ItemEnchantsComponent } from "@minecraft/server";
import { ModalFormResponse, ModalFormData } from "@minecraft/server-ui";
import { uiINVENTORY } from "../uiInventory";

export function uiItemEditor(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditor(InvEditorUIResult, onlineList, player, targetPlayer, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditor(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, targetPlayer: Player, itemSlot: number) {
        const [deleteToggle, renameToggle, txtRename, replaceToggle, txtReplace, enchantToggle, txtEnchant, txtEnchantValue, removeEnchantToggle, txtRemovEnchant, transferToggle, value] = InvEditorUIResult.formValues;
        //Member is used when transferring an Item.
        let member: Player = undefined;
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        let item = container.getItem(itemSlot);
        //Are we Deleting the item?
        if (deleteToggle == true) {
            container.setItem(itemSlot);
        }
        //Are we renaming the item?
        if (renameToggle == true) {
            item.nameTag = txtRename.toString();
            container.setItem(itemSlot, item);
        }
        //Are we replacing the item?
        if (replaceToggle === true) {
            const itemStack = new ItemStack("minecraft:" + txtReplace);
            container.setItem(itemSlot, itemStack);
        }
        //Are we adding enchantments?
        if (enchantToggle == true) {
            if (item) {
                const enchantmentsComponent = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                const enchantmentList = enchantmentsComponent.enchantments;

                let addedCustomEnchantment = enchantmentList.addEnchantment(new Enchantment(txtEnchant.toString(), parseInt(txtEnchantValue.toString())));
                enchantmentsComponent.enchantments = enchantmentList;
                container.setItem(itemSlot, item);
                if (!addedCustomEnchantment) {
                    world.sendMessage("Unable to enchant: " + item.typeId + " Enchantment to be applied: " + txtEnchant + ", " + txtEnchantValue);
                }
            }
        }
        if (removeEnchantToggle == true) {
            //Are we removing enchantments?
            const enchantmentsComponent = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
            const enchantmentList = enchantmentsComponent.enchantments;
            enchantmentList.removeEnchantment(txtRemovEnchant.toString());
            enchantmentsComponent.enchantments = enchantmentList;
        }
        console.log(member);
        console.log(transferToggle);
        // Present the InventoryUI selection screen again.
        const inventoryUI = new ModalFormData();
        inventoryUI.title("§4Paradox - Inventory Managment§4");
        let onlinePlayerList: string[] = [];
        onlinePlayerList = Array.from(world.getPlayers(), (player) => player.name);
        inventoryUI.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlineList);
        inventoryUI.show(player).then((inventoryUIResult) => {
            uiINVENTORY(inventoryUIResult, onlinePlayerList, player);
            return;
        });
    }
}
