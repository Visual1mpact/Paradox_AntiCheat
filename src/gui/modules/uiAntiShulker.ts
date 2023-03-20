import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";

import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTISHULKER(antishulkerResult: ModalFormResponse, player: Player) {
    const [AntiShulkerToggle] = antishulkerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (AntiShulkerToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antishulker_b", true);
        world.setDynamicProperty("antishulker_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti-Shulkers§r!`);
    }
    if (AntiShulkerToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antishulker_b", false);
        world.setDynamicProperty("antishulker_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti-Shulkers§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
