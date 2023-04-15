import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { IllegalItemsB } from "../../penrose/beforeitemuseonevent/illegalitems/illegalitems_b.js";
import { IllegalItemsC } from "../../penrose/blockplaceevent/illegalitems/illegalitems_c.js";
import { IllegalItemsA } from "../../penrose/tickevent/illegalitems/illegalitems_a.js";
import { IllegalItemsD } from "../../penrose/tickevent/illegalitems/illegalitems_d.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiILLEGALITEMS(illegalitemsResult: ModalFormResponse, player: Player) {
    const [IllegalItemsAToggle, IllegalItemsBToggle, IllegalItemsCToggle, IllegalItemsDToggle, IllegalEnchanmentsToggle, IllegalLoreToggle, IllegalStackBanToggle] = illegalitemsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Illegal Items`);
    }
    if (IllegalItemsAToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsa_b", true);
        world.setDynamicProperty("illegalitemsa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsA§r!`);
        IllegalItemsA();
    }
    if (IllegalItemsAToggle === false) {
        dynamicPropertyRegistry.set("illegalitemsa_b", false);
        world.setDynamicProperty("illegalitemsa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsA§r!`);
    }
    if (IllegalItemsBToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsb_b", true);
        world.setDynamicProperty("illegalitemsb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsB§r!`);
        IllegalItemsB();
    }
    if (IllegalItemsBToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsb_b", false);
        world.setDynamicProperty("illegalitemsb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsB§r!`);
    }
    if (IllegalItemsCToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsc_b", true);
        world.setDynamicProperty("illegalitemsc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsC§r!`);
        IllegalItemsC();
    }
    if (IllegalItemsCToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsc_b", false);
        world.setDynamicProperty("illegalitemsc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsC§r!`);
    }
    if (IllegalItemsDToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsd_b", true);
        world.setDynamicProperty("illegalitemsd_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsD§r!`);
        IllegalItemsD();
    }
    if (IllegalItemsDToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsd_b", false);
        world.setDynamicProperty("illegalitemsd_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsD§r!`);
    }
    if (IllegalEnchanmentsToggle === true) {
        dynamicPropertyRegistry.set("illegalenchantment_b", true);
        world.setDynamicProperty("illegalenchantment_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalEnchantments§r!`);
    }
    if (IllegalEnchanmentsToggle === false) {
        dynamicPropertyRegistry.set("illegalenchantment_b", false);
        world.setDynamicProperty("illegalenchantment_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalEnchantments§r!`);
    }
    if (IllegalLoreToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("illegallores_b", true);
        world.setDynamicProperty("illegallores_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalLores§r!`);
    }
    if (IllegalLoreToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("illegallores_b", false);
        world.setDynamicProperty("illegallores_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalLores§r!`);
    }
    //Check to make sure that Illegal Items are on
    if (!IllegalItemsAToggle === true && !IllegalItemsAToggle === true && !IllegalItemsCToggle === true && IllegalStackBanToggle === true) {
        // Turn it off just incase!
        dynamicPropertyRegistry.set("stackban_b", false);
        world.setDynamicProperty("stackban_b", false);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable Illegal Items to use this feature.`);
        return paradoxui(player);
    }

    if (IllegalStackBanToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("stackban_b", true);
        world.setDynamicProperty("stackban_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6StackBans§r!`);
    }
    if (IllegalStackBanToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("stackban_b", false);
        world.setDynamicProperty("stackban_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4StackBans§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
