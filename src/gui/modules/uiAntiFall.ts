import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { paradoxui } from "../paradoxui.js";
import { sendMsgToPlayer, sendMsg } from "../../util.js";
import { AntiFallA } from "../../penrose/TickEvent/antifalla/antifall_a.js";

export async function uiANTIFALL(antifallResult: ModalFormResponse, player: Player) {
    const [AntiFallToggle] = antifallResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anit Fall`);
    }
    if (AntiFallToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antifalla_b", true);
        world.setDynamicProperty("antifalla_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6AntiFallA§f!`);
        AntiFallA();
    }
    if (AntiFallToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antifalla_b", false);
        world.setDynamicProperty("antifalla_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4AntiFallA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
