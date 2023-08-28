import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../../../penrose/WorldInitializeAfterEvent/registry";
import { uiILLEGALITEMS } from "../../../modules/uiIllegaItems";

export function illegalItemsHandler(player: Player) {
    //Illegal items this will cover a few modules so will group these into one UI.
    const modulesillegalitemsui = new ModalFormData();
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b") as boolean;
    const illegalItemsBBoolean = dynamicPropertyRegistry.get("illegalitemsb_b") as boolean;
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b") as boolean;
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b") as boolean;
    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b") as boolean;
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b") as boolean;
    modulesillegalitemsui.title("§4Paradox Modules - Illegal Items§4");
    modulesillegalitemsui.toggle("Illegal Items A - Checks for player's that have illegal items in inventory:", illegalItemsABoolean);
    modulesillegalitemsui.toggle("Illegal Items B - Checks for player's that place illegal items:", illegalItemsBBoolean);
    modulesillegalitemsui.toggle("Illegal Items C - Checks for illegal dropped items:", illegalItemsCBoolean);
    modulesillegalitemsui.toggle("Illegal Enchants - Checks for items with illegal enchantments:", illegalEnchantmentBoolean);
    modulesillegalitemsui.toggle("Illegal Lores - Checks for illegal Lores on items:", illegalLoresBoolean);
    modulesillegalitemsui.toggle("Stack Ban - Checks for player's with illegal stacks:", stackBanBoolean);
    modulesillegalitemsui
        .show(player)
        .then((illegalitemsResult) => {
            uiILLEGALITEMS(illegalitemsResult, player);
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
