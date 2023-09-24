import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { paradoxui } from "../paradoxui.js";
import { sendMsgToPlayer, sendMsg } from "../../util.js";
import { AntiFallA } from "../../penrose/TickEvent/antifalla/antifall_a.js";

/**
 * Handles the result of a modal form used for toggling anti-fall mode.
 *
 * @name uiANTIFALL
 * @param {ModalFormResponse} antifallResult - The result of the anti-fall mode toggle modal form.
 * @param {Player} player - The player who triggered the anti-fall mode toggle modal form.
 */
export function uiANTIFALL(antifallResult: ModalFormResponse, player: Player) {
    handleUIAntiFall(antifallResult, player).catch((error) => {
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

async function handleUIAntiFall(antifallResult: ModalFormResponse, player: Player) {
    if (!antifallResult || antifallResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AntiFallToggle] = antifallResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Fall`);
    }
    if (AntiFallToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antifalla_b", true);
        world.setDynamicProperty("antifalla_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6AntiFallA§f!`);
        AntiFallA();
    }
    if (AntiFallToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antifalla_b", false);
        world.setDynamicProperty("antifalla_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4AntiFallA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
