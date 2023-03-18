import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { InvalidSprintA } from "../../penrose/tickevent/invalidsprint/invalidsprint_a.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiINVALIDSPRINT(invalidsprintResult: ModalFormResponse, player: Player) {
    const [InvalidSprintToggle] = invalidsprintResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (InvalidSprintToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("invalidsprinta_b", true);
        world.setDynamicProperty("invalidsprinta_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6InvalidSprintA§r!`);
        InvalidSprintA();
    }

    if (InvalidSprintToggle === false) {
        dynamicPropertyRegistry.set("invalidsprinta_b", false);
        world.setDynamicProperty("invalidsprinta_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4InvalidSprintA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
