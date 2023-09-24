import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";

import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTISHULKER(antishulkerResult: ModalFormResponse, player: Player) {
    if (!antishulkerResult || antishulkerResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AntiShulkerToggle] = antishulkerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Shulker`);
    }
    if (AntiShulkerToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antishulker_b", true);
        world.setDynamicProperty("antishulker_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti-Shulkers§f!`);
    }
    if (AntiShulkerToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antishulker_b", false);
        world.setDynamicProperty("antishulker_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti-Shulkers§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
