import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { InvalidSprintA } from "../../penrose/TickEvent/invalidsprint/invalidsprint_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiINVALIDSPRINT(invalidsprintResult: ModalFormResponse, player: Player) {
    if (!invalidsprintResult || invalidsprintResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [InvalidSprintToggle] = invalidsprintResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Invalid Sprint`);
    }
    if (InvalidSprintToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("invalidsprinta_b", true);
        world.setDynamicProperty("invalidsprinta_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6InvalidSprintA§f!`);
        InvalidSprintA();
    }

    if (InvalidSprintToggle === false) {
        dynamicPropertyRegistry.set("invalidsprinta_b", false);
        world.setDynamicProperty("invalidsprinta_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4InvalidSprintA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
