import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { NoSlowA } from "../../penrose/tickevent/noslow/noslow_a.js";

import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiNOWSLOW(noslowResult: ModalFormResponse, player: Player) {
    const [NoSlowToggle] = noslowResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (NoSlowToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("noslowa_b", true);
        world.setDynamicProperty("noslowa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6NoSlowA§r!`);
        NoSlowA();
    }
    if (NoSlowToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("noslowa_b", false);
        world.setDynamicProperty("noslowa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4NoSlowA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
