import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { paradoxui } from "../paradoxui.js";
import { sendMsgToPlayer, sendMsg } from "../../util.js";
import { FlyA } from "../../penrose/TickEvent/fly/fly_a.js";

export function uiANTIFLY(antiflyResult: ModalFormResponse, player: Player) {
    if (!antiflyResult || antiflyResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AntiFlyToggle] = antiflyResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Fly`);
    }
    if (AntiFlyToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("flya_b", true);
        world.setDynamicProperty("flya_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6FlyA§f!`);
        FlyA();
    }
    if (AntiFlyToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("flya_b", false);
        world.setDynamicProperty("flya_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4FlyA§f!`);
    }
    //show the main ui to the player once complete.
    return paradoxui(player);
}
