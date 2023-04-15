import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { OPS } from "../../penrose/tickevent/oneplayersleep/oneplayersleep.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiOPS(opsResult: ModalFormResponse, player: Player) {
    const [OnePlayerSleepToggle] = opsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure OPS`);
    }
    if (OnePlayerSleepToggle === true) {
        dynamicPropertyRegistry.set("ops_b", true);
        world.setDynamicProperty("ops_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6OPS§r!`);
        OPS();
    }
    if (OnePlayerSleepToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("ops_b", false);
        world.setDynamicProperty("ops_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4OPS§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
