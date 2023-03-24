import { Player, world, dynamicPropertyRegistry, paradoxui, sendMsg, sendMsgToPlayer, AntiFallA } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export async function uiANTIFALL(antifallResult: ModalFormResponse, player: Player) {
    const [AntiFallToggle] = antifallResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anit Fall`);
    }
    if (AntiFallToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antifalla_b", true);
        world.setDynamicProperty("antifalla_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6AntiFallA§r!`);
        AntiFallA();
    }
    if (AntiFallToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antifalla_b", false);
        world.setDynamicProperty("antifalla_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4AntiFallA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
