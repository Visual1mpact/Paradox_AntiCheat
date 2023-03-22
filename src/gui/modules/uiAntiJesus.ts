import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { JesusA } from "../../penrose/tickevent/jesus/jesus_a.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTIJESUS(antijesusResult: ModalFormResponse, player: Player) {
    const [AntiJesusToggle] = antijesusResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Jesus`);
    }
    if (AntiJesusToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("jesusa_b", true);
        world.setDynamicProperty("jesusa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6JesusA§r!`);
        JesusA();
    }
    if (AntiJesusToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("jesusa_b", false);
        world.setDynamicProperty("jesusa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4JesusA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
