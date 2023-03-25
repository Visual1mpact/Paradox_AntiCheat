import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { ClearLag } from "../../penrose/tickevent/clearlag/clearlag.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiLAGCLEAR(lagclearResult: ModalFormResponse, player: Player) {
    const [LagClearToggle] = lagclearResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Clear Lag`);
    }
    if (LagClearToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("clearlag_b", true);
        world.setDynamicProperty("clearlag_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ClearLag§r!`);
        ClearLag();
    }
    if (LagClearToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("clearlag_b", false);
        world.setDynamicProperty("clearlag_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ClearLag§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
