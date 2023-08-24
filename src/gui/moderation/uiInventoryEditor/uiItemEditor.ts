import { EntityInventoryComponent, Player, world, ItemStack } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";

export function uiItemEditor(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, itemSlot: number) {
    handleUIitemEditor(InvEditorUIResult, onlineList, player, itemSlot).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });

    async function handleUIitemEditor(InvEditorUIResult: ModalFormResponse, onlineList: string[], player: Player, itemSlot: number) {
        const [deleteToggle, renameToggle, txtRename, replaceToggle, txtReplace, enchantToggle, txtEnchant, txtEnchantValue, transferToggle, value] = InvEditorUIResult.formValues;
        //Member is used when transferring an Item.
        let member: Player = undefined;
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }

        const inv = player.getComponent("inventory") as EntityInventoryComponent;
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
        console.log(replaceToggle);
        console.log(txtReplace);
        console.log(enchantToggle);
        console.log(txtEnchant);
        console.log(txtEnchantValue);
        console.log(transferToggle);
        console.log(member);
    }
}
