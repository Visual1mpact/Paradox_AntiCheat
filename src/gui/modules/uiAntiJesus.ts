import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { JesusA } from "../../penrose/TickEvent/jesus/jesus_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTIJESUS(antijesusResult: ModalFormResponse, player: Player) {
    if (!antijesusResult || antijesusResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AntiJesusToggle] = antijesusResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Jesus`);
    }
    if (AntiJesusToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("jesusa_b", true);
        world.setDynamicProperty("jesusa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6JesusA§f!`);
        JesusA();
    }
    if (AntiJesusToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("jesusa_b", false);
        world.setDynamicProperty("jesusa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4JesusA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
