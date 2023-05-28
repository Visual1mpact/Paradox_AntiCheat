import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { CrasherA } from "../../penrose/TickEvent/crasher/crasher_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTICRASHER(anticrasherResult: ModalFormResponse, player: Player) {
    const [AntiCrasherToggle] = anticrasherResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Crasher`);
    }
    if (AntiCrasherToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("crashera_b", true);
        world.setDynamicProperty("crashera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6CrasherA§r!`);
        CrasherA();
    }
    if (AntiCrasherToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("crashera_b", false);
        world.setDynamicProperty("crashera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4CrasherA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
