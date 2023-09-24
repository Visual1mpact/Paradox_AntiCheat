import { Player } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

/**
 * Handles the result of a modal form used for toggling enchanted armor mode.
 *
 * @name uiENCHANTEDARMOR
 * @param {ModalFormResponse} enchantedarmorResult - The result of the enchanted armor mode toggle modal form.
 * @param {Player} player - The player who triggered the enchanted armor mode toggle modal form.
 */
export function uiENCHANTEDARMOR(enchantedarmorResult: ModalFormResponse, player: Player) {
    handleUIEnchantedArmor(enchantedarmorResult, player).catch((error) => {
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

async function handleUIEnchantedArmor(enchantedarmorResult: ModalFormResponse, player: Player) {
    if (!enchantedarmorResult || enchantedarmorResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [EnchantedArmorToggle] = enchantedarmorResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Enchanted Armor`);
    }
    if (EnchantedArmorToggle === true) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config encharmor 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti Enchanted Armor§f!`);
    }
    if (EnchantedArmorToggle === false) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config encharmor 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti Enchanted Armor§f!`);
    }
    player.runCommand(`scoreboard players operation @a encharmor = paradox:config encharmor`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
