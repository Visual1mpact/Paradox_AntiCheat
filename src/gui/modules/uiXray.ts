import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { XrayA } from "../../penrose/BlockBreakAfterEvent/xray/xray_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiXRAY(xrayResult: ModalFormResponse, player: Player) {
    const [XrayToggle] = xrayResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Xray`);
    }
    if (XrayToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("xraya_b", true);
        world.setDynamicProperty("xraya_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6XrayA§r!`);
        XrayA();
    }
    if (XrayToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("xraya_b", false);
        world.setDynamicProperty("xraya_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4XrayA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
