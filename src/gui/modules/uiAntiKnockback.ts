import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { AntiKnockbackA } from "../../penrose/TickEvent/knockback/antikb_a.js";

/**
 * Handles the result of a modal form used for toggling anti-knockback mode.
 *
 * @name uiANTIKNOCKBACK
 * @param {ModalFormResponse} antiknockbackResult - The result of the anti-knockback mode toggle modal form.
 * @param {Player} player - The player who triggered the anti-knockback mode toggle modal form.
 */
export function uiANTIKNOCKBACK(antiknockbackResult: ModalFormResponse, player: Player) {
    handleUIAntiKnockback(antiknockbackResult, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleUIAntiKnockback(antiknockbackResult: ModalFormResponse, player: Player) {
    const [AntiKnockBackToggle] = antiknockbackResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Knockback`);
    }

    if (AntiKnockBackToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antikb_b", true);
        world.setDynamicProperty("antikb_b", true);
        player.runCommand(`scoreboard players set paradox:config antikb 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6Anti Knockback§f!`);
        AntiKnockbackA();
    }
    if (AntiKnockBackToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antikb_b", false);
        world.setDynamicProperty("antikb_b", false);
        player.runCommand(`scoreboard players set paradox:config antikb 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4Anti Knockback§f!`);
    }
    player.runCommand(`scoreboard players operation @a antikb = paradox:config antikb`);

    //show the main ui to the player once complete.
    return paradoxui(player);
}
