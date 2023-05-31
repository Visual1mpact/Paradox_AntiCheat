import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { BadPackets1 } from "../../penrose/ChatSendBeforeEvent/spammer/badpackets_1.js";
import { BadPackets2 } from "../../penrose/TickEvent/badpackets2/badpackets2.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiBADPACKETS(badpacketsResult: ModalFormResponse, player: Player) {
    const [BadPackets1Toggle, BadPackets2Toggle] = badpacketsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b");
    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Badpackets`);
    }
    if (BadPackets1Toggle === true && badPackets1Boolean === false) {
        // Allow
        dynamicPropertyRegistry.set("badpackets1_b", true);
        world.setDynamicProperty("badpackets1_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6Badpackets1§r!`);
        BadPackets1();
    }
    if (BadPackets1Toggle === false && badPackets1Boolean === true) {
        // Deny
        dynamicPropertyRegistry.set("badpackets1_b", false);
        world.setDynamicProperty("badpackets1_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4Badpackets1§r!`);
    }
    if (BadPackets2Toggle === true && badPackets2Boolean === false) {
        // Allow
        dynamicPropertyRegistry.set("badpackets2_b", true);
        world.setDynamicProperty("badpackets2_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6Badpackets2§r!`);
        BadPackets2();
    }
    if (BadPackets2Toggle === false && badPackets2Boolean === true) {
        // Deny
        dynamicPropertyRegistry.set("badpackets2_b", false);
        world.setDynamicProperty("badpackets2_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4Badpackets2§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
