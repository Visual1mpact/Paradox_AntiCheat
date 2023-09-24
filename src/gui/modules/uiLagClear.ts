import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { ClearLag } from "../../penrose/TickEvent/clearlag/clearlag.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiLAGCLEAR(lagclearResult: ModalFormResponse, player: Player) {
    if (!lagclearResult || lagclearResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [LagClearToggle] = lagclearResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Clear Lag`);
    }
    if (LagClearToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("clearlag_b", true);
        world.setDynamicProperty("clearlag_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6ClearLag§f!`);
        ClearLag();
    }
    if (LagClearToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("clearlag_b", false);
        world.setDynamicProperty("clearlag_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4ClearLag§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
