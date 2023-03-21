import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { BadPackets1 } from "../../penrose/beforechatevent/spammer/badpackets_1.js";
import { BadPackets2 } from "../../penrose/tickevent/badpackets2/badpackets2.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiBADPACKETS(badpacketsResult: ModalFormResponse, player: Player) {
    const [BadPackets1Toggle, BadPackets2Toggle] = badpacketsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (BadPackets1Toggle === true) {
        // Allow
        dynamicPropertyRegistry.set("badpackets1_b", true);
        world.setDynamicProperty("badpackets1_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets1§r!`);
        BadPackets1();
    }
    if (BadPackets1Toggle === false) {
        // Deny
        dynamicPropertyRegistry.set("badpackets1_b", false);
        world.setDynamicProperty("badpackets1_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets1§r!`);
    }
    if (BadPackets2Toggle === true) {
        // Allow
        dynamicPropertyRegistry.set("badpackets2_b", true);
        world.setDynamicProperty("badpackets2_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets2§r!`);
        BadPackets2();
    }
    if (BadPackets2Toggle === false) {
        // Deny
        dynamicPropertyRegistry.set("badpackets2_b", false);
        world.setDynamicProperty("badpackets2_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets2§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
