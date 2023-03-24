import { Player, world, XrayA, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiXRAY(xrayResult: ModalFormResponse, player: Player) {
    const [XrayToggle] = xrayResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

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
