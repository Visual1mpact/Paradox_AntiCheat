import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { ReachB } from "../../penrose/EntityHitEntityAfterEvent/reach_b.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { BeforeReachA } from "../../penrose/PlayerPlaceBlockBeforeEvent/reach/reach_a.js";

export function uiREACH(reachResult: ModalFormResponse, player: Player) {
    if (!reachResult || reachResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [ReachAToggle, ReachBToggle] = reachResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Reach`);
    }
    if (ReachAToggle === true && reachABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("reacha_b", true);
        world.setDynamicProperty("reacha_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6ReachA§f!`);
        BeforeReachA();
    }
    if (ReachAToggle === false && reachABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("reacha_b", false);
        world.setDynamicProperty("reacha_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4ReachA§f!`);
    }
    if (ReachBToggle === true && reachBBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("reachb_b", true);
        world.setDynamicProperty("reachb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6ReachB§f!`);
        ReachB();
    }
    if (ReachBToggle === false && reachBBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("reachb_b", false);
        world.setDynamicProperty("reachb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4ReachB§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
