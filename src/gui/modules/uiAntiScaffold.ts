import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { ScaffoldA } from "../../penrose/BlockPlaceAfterEvent/scaffold/scaffold_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiANTISCAFFOLD(antiscaffoldResult: ModalFormResponse, player: Player) {
    const [AntiScaffoldToggle] = antiscaffoldResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Scaffold`);
    }

    if (AntiScaffoldToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antiscaffolda_b", true);
        world.setDynamicProperty("antiscaffolda_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6AntiScaffoldA§f!`);
        ScaffoldA();
    }
    if (AntiScaffoldToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antiscaffolda_b", false);
        world.setDynamicProperty("antiscaffolda_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4AntiScaffoldA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
