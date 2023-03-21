import { Player } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiENCHANTEDARMOR(enchantedarmorResult: ModalFormResponse, player: Player) {
    const [EnchantedArmorToggle] = enchantedarmorResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (EnchantedArmorToggle === true) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config encharmor 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Enchanted Armor§r!`);
    }
    if (EnchantedArmorToggle === false) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config encharmor 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Enchanted Armor§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a encharmor = paradox:config encharmor`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
