import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { beforeAntiSpam } from "../../penrose/ChatSendBeforeEvent/chat/antispam.js";

import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiANTISPAM(antispamResult: ModalFormResponse, player: Player) {
    const [AntiSpamToggle] = antispamResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Spam`);
    }
    if (AntiSpamToggle === true) {
        /// Allow
        dynamicPropertyRegistry.set("antispam_b", true);
        world.setDynamicProperty("antispam_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6Anti Spam§r!`);
        beforeAntiSpam();
    }
    if (AntiSpamToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antispam_b", false);
        world.setDynamicProperty("antispam_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4Anti Spam§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
