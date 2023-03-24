import { Player, world, AntiSpam, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiANTISPAM(antispamResult: ModalFormResponse, player: Player) {
    const [AntiSpamToggle] = antispamResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Spam`);
    }
    if (AntiSpamToggle === true) {
        /// Allow
        dynamicPropertyRegistry.set("antispam_b", true);
        world.setDynamicProperty("antispam_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Spam§r!`);
        AntiSpam();
    }
    if (AntiSpamToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antispam_b", false);
        world.setDynamicProperty("antispam_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Spam§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
