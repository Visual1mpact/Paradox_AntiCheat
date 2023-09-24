import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiEXPSALVAGESYSTEM(expsalvagesystemResult: ModalFormResponse, player: Player) {
    if (!expsalvagesystemResult || expsalvagesystemResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [ExpSalvageSystemToggle] = expsalvagesystemResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Exp Salvage System`);
    }
    if (ExpSalvageSystemToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("salvage_b", true);
        world.setDynamicProperty("salvage_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Salvage§f!`);
    }
    if (ExpSalvageSystemToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("salvage_b", false);
        world.setDynamicProperty("salvage_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Salvage§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
