import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiEXPSALVAGESYSTEM(expsalvagesystemResult: ModalFormResponse, player: Player) {
    const [ExpSalvageSystemToggle] = expsalvagesystemResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Exp Salvage System`);
    }
    if (ExpSalvageSystemToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("salvage_b", true);
        world.setDynamicProperty("salvage_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Salvage§r!`);
    }
    if (ExpSalvageSystemToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("salvage_b", false);
        world.setDynamicProperty("salvage_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Salvage§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
