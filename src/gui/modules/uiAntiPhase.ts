import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { AntiPhaseA } from "../../penrose/TickEvent/phase/phase_a.js";

export function uiANTIPHASE(antiphaseResult: ModalFormResponse, player: Player) {
    if (!antiphaseResult || antiphaseResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    // Get Dynamic Property Boolean
    const [AntiPhaseToggle] = antiphaseResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Phase`);
    }
    if (AntiPhaseToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antiphasea_b", true);
        world.setDynamicProperty("antiphasea_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6AntiPhaseA§f!`);
        AntiPhaseA();
    }
    if (AntiPhaseToggle === false) {
        dynamicPropertyRegistry.set("antiphasea_b", false);
        world.setDynamicProperty("antiphasea_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4AntiPhaseA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
