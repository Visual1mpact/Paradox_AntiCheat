import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { OPS } from "../../penrose/TickEvent/oneplayersleep/oneplayersleep.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiOPS(opsResult: ModalFormResponse, player: Player) {
    if (!opsResult || opsResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [OnePlayerSleepToggle] = opsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure OPS`);
    }
    if (OnePlayerSleepToggle === true) {
        dynamicPropertyRegistry.set("ops_b", true);
        world.setDynamicProperty("ops_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6OPS§f!`);
        OPS();
    }
    if (OnePlayerSleepToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("ops_b", false);
        world.setDynamicProperty("ops_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4OPS§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
