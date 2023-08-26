import { EntityInventoryComponent, Player, world, ItemStack, Enchantment, ItemEnchantsComponent } from "@minecraft/server";
import { ModalFormResponse, ModalFormData } from "@minecraft/server-ui";
import { uiINVENTORY } from "../uiInventory";
import { sendMsgToPlayer } from "../../../util";
/**
 * Handles the result of a modal form used for transferring an item from the targeted player's inventory to the selected player's inventory.
 *
 * @name uiItemEditorTransfer
 * @param {ModalFormResponse} InvEditorUIResult - The result of the inventory editor modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the inventory management modal form.
 * @param targetPlayer - The player who has been targeted.
 * @param itemSlot  - the item slot number of the targeted player.
 */
export function uiItemEditorTransfer(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorTransfer(InvEditorUIResult, onlineList, player, targetPlayer, itemSlot).catch((error) => {
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
/**
 * Handles the result of a modal form used for adding or removing enchantments to the selected item from the targeted player's inventory
 * @name uiItemEditorEnchantments
 * @param {ModalFormResponse} InvEditorUIResult - The result of the inventory editor modal form.
 * @param {Player} player - The player who triggered the inventory management modal form.
 * @param targetPlayer - The player who has been targeted.
 * @param itemSlot  - the item slot number of the targeted player.
 */
export function uiItemEditorEnchantments(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorEnchantments(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
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

    async function handleUIitemEditorEnchantments(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
        const [enchantToggle, txtEnchant, txtEnchantValue, removeEnchantToggle, txtRemovEnchant] = InvEditorUIResult.formValues;

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        const item = container.getItem(itemSlot);

        //Are we adding enchantments?
        if (enchantToggle == true) {
            if (item) {
                const enchantmentsComponent = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                const enchantmentList = enchantmentsComponent.enchantments;

                const addedCustomEnchantment = enchantmentList.addEnchantment(new Enchantment(txtEnchant.toString(), parseInt(txtEnchantValue.toString())));
                enchantmentsComponent.enchantments = enchantmentList;
                container.setItem(itemSlot, item);
                if (!addedCustomEnchantment) {
                    sendMsgToPlayer(player, "Unable to enchant: " + item.typeId + " Enchantment to be applied: " + txtEnchant + ", " + txtEnchantValue);
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
/**
 * Handles the result of a modal form used for renaming or editing the lore the selected item from the targeted player's inventory
 * @name uiItemEditorName
 * @param {ModalFormResponse} InvEditorUIResult - The result of the inventory editor modal form.
 * @param {Player} player - The player who triggered the inventory management modal form.
 * @param targetPlayer - The player who has been targeted.
 * @param itemSlot  - the item slot number of the targeted player.
 */
export function uiItemEditorName(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorName(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
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

    async function handleUIitemEditorName(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
        const [renameToggle, txtRename, loreToggle, txtLore] = InvEditorUIResult.formValues;

        const inv = targetPlayer.getComponent("inventory") as EntityInventoryComponent;
        const container = inv.container;
        const item = container.getItem(itemSlot);
        //Are we renaming the item?
        if (renameToggle == true) {
            item.nameTag = txtRename.toString();
            container.setItem(itemSlot, item);
        }
        if (loreToggle == true) {
            const loreArray = txtLore.toString().split(",");
            item.setLore(loreArray);
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
/**
 * Handles the result of a modal form used for replacing or deleting the selected item from the targeted player's inventory
 * @name uiItemEditorReplace
 * @param {ModalFormResponse} InvEditorUIResult - The result of the inventory editor modal form.
 * @param {Player} player - The player who triggered the inventory management modal form.
 * @param targetPlayer - The player who has been targeted.
 * @param itemSlot  - the item slot number of the targeted player.
 */
export function uiItemEditorReplace(InvEditorUIResult: ModalFormResponse, player: Player, targetPlayer: Player, itemSlot: number) {
    handleUIitemEditorReplace(InvEditorUIResult, player, targetPlayer, itemSlot).catch((error) => {
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
