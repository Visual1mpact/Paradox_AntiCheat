import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { getScore } from "../../../../util";
import { uiENCHANTEDARMOR } from "../../../modules/uiEnchantedArmor";

export function antiEnchantedArmorHandler(player: Player) {
    const modulesenchantedarmorui = new ModalFormData();
    const encharmorscore = getScore("encharmor", player);
    let enchantedarmorBoolean: boolean;
    /**get the score value and then check to see if its already enable or already disabled
     * so we can then update the control boolean to disaply its current setting to the player
     * in the menu.
     */
    if (encharmorscore <= 0) {
        enchantedarmorBoolean = false;
    }
    if (encharmorscore >= 1) {
        enchantedarmorBoolean = true;
    }
    modulesenchantedarmorui.title("§4Paradox Modules - Enchanted Armor§4");
    modulesenchantedarmorui.toggle("Enchanted Armor - Anti Enchanted Armor for all players:", enchantedarmorBoolean);
    modulesenchantedarmorui.show(player).then((enchantedarmorResult) => {
        uiENCHANTEDARMOR(enchantedarmorResult, player);
    });
}
