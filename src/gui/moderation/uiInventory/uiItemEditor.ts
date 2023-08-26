import { EntityInventoryComponent, Player, world, ItemStack, Enchantment, ItemEnchantsComponent } from "@minecraft/server";
import { ModalFormResponse, ModalFormData } from "@minecraft/server-ui";
import { uiINVENTORY } from "../uiInventory";

export function uiItemEditorTransfer(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorTransfer(InvEditorUIResult, onlineList, player, targetPlayer, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditorTransfer(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, targetPlayer: Player, itemSlot: number) {
        const [transferToggle, value] = InvEditorUIResult.formValues;
        //Member is used when transferring an Item.
        let member: Player = undefined;
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
        if (transferToggle == true) {
            //Member is the player the item is being transfered to
            const targetPlayerinv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
            const memberPlayerinv = member.getComponent("inventory") as EntityInventoryComponent;
            let freeSlot: number;
            const maxSlots = 36; // Maximum number of slots in the player's inventory

            // Loop through the inventory and add items to the itemArray
            for (let i = 0; i < maxSlots; i++) {
                const item = memberPlayerinv.container.getItem(i);
                if (item?.typeId) {
                } else {
                    freeSlot = i;
                    break;
                }
            }
            targetPlayerinv.container.moveItem(itemSlot, freeSlot, memberPlayerinv.container);
        }
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
export function uiItemEditorEnchantments(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorEnchantments(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditorEnchantments(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
        const [enchantToggle, txtEnchant, txtEnchantValue, removeEnchantToggle, txtRemovEnchant] = InvEditorUIResult.formValues;

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        let item = container.getItem(itemSlot);

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
            container.setItem(itemSlot, item);
        }
        // Present the InventoryUI selection screen again.
        const inventoryUI = new ModalFormData();
        inventoryUI.title("§4Paradox - Inventory Managment§4");
        let onlinePlayerList: string[] = [];
        onlinePlayerList = Array.from(world.getPlayers(), (player) => player.name);
        inventoryUI.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlinePlayerList);
        inventoryUI.show(player).then((inventoryUIResult) => {
            uiINVENTORY(inventoryUIResult, onlinePlayerList, player);
            return;
        });
    }
}
export function uiItemEditorName(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorName(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditorName(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
        const [renameToggle, txtRename, loreToggle, txtLore] = InvEditorUIResult.formValues;

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        let item = container.getItem(itemSlot);
        //Are we renaming the item?
        if (renameToggle == true) {
            item.nameTag = txtRename.toString();
            container.setItem(itemSlot, item);
        }
        if (loreToggle == true) {
            item.setLore([txtLore.toString()]);
            container.setItem(itemSlot, item);
        }

        // Present the InventoryUI selection screen again.
        const inventoryUI = new ModalFormData();
        inventoryUI.title("§4Paradox - Inventory Managment§4");
        let onlinePlayerList: string[] = [];
        onlinePlayerList = Array.from(world.getPlayers(), (player) => player.name);
        inventoryUI.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlinePlayerList);
        inventoryUI.show(player).then((inventoryUIResult) => {
            uiINVENTORY(inventoryUIResult, onlinePlayerList, player);
            return;
        });
    }
}
export function uiItemEditorReplace(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorReplace(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditorReplace(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
        const [replaceToggle, txtReplace, deleteToggle] = InvEditorUIResult.formValues;

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        //Are we replacing the item?
        if (replaceToggle === true) {
            const itemStack = new ItemStack("minecraft:" + txtReplace);
            container.setItem(itemSlot, itemStack);
        }
        if (deleteToggle == true) {
            container.setItem(itemSlot);
        }

        // Present the InventoryUI selection screen again.
        const inventoryUI = new ModalFormData();
        inventoryUI.title("§4Paradox - Inventory Managment§4");
        let onlinePlayerList: string[] = [];
        onlinePlayerList = Array.from(world.getPlayers(), (player) => player.name);
        inventoryUI.dropdown(`\n§fSelect a player:§f\n\nPlayer's Online\n`, onlinePlayerList);
        inventoryUI.show(player).then((inventoryUIResult) => {
            uiINVENTORY(inventoryUIResult, onlinePlayerList, player);
            return;
        });
    }
}
