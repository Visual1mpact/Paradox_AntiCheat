import { Player, world, dynamicPropertyRegistry, paradoxui, sendMsg, sendMsgToPlayer, FlyA } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiANTIFLY(antiflyResult: ModalFormResponse, player: Player) {
    const [AntiFlyToggle] = antiflyResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Fly`);
    }
    if (AntiFlyToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("flya_b", true);
        world.setDynamicProperty("flya_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6FlyA§r!`);
        FlyA();
    }
    if (AntiFlyToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("flya_b", false);
        world.setDynamicProperty("flya_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4FlyA§r!`);
    }
    //show the main ui to the player once complete.
    return paradoxui(player);
}
