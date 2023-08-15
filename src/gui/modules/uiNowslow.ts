import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { NoSlowA } from "../../penrose/TickEvent/noslow/noslow_a.js";

import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiNOWSLOW(noslowResult: ModalFormResponse, player: Player) {
    const [NoSlowToggle] = noslowResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure No Slow`);
    }
    if (NoSlowToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("noslowa_b", true);
        world.setDynamicProperty("noslowa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6NoSlowA§f!`);
        NoSlowA();
    }
    if (NoSlowToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("noslowa_b", false);
        world.setDynamicProperty("noslowa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4NoSlowA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
