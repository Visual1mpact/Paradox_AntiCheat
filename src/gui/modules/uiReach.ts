import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { ReachB } from "../../penrose/blockbreakevent/reach/reach_b.js";
import { ReachA } from "../../penrose/blockplaceevent/reach/reach_a.js";
import { ReachC } from "../../penrose/entityhitevent/reach_c.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiREACH(reachResult: ModalFormResponse, player: Player) {
    const [ReachAToggle, ReachBToggle, ReachCToggle] = reachResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Reach`);
    }
    if (ReachAToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("reacha_b", true);
        world.setDynamicProperty("reacha_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ReachA§r!`);
        ReachA();
    }
    if (ReachAToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("reacha_b", false);
        world.setDynamicProperty("reacha_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ReachA§r!`);
    }
    if (ReachBToggle === true) {
        // Allow
        world.setDynamicProperty("reachb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ReachB§r!`);
        ReachB();
    }
    if (ReachBToggle === false) {
        // Deny
        world.setDynamicProperty("reachb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ReachB§r!`);
    }
    if (ReachCToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("reachc_b", true);
        world.setDynamicProperty("reachc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ReachC§r!`);
        ReachC();
    }
    if (ReachCToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("reachc_b", false);
        world.setDynamicProperty("reachc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ReachC§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
