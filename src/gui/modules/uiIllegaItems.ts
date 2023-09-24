import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { IllegalItemsB } from "../../penrose/PlayerPlaceBlockAfterEvent/illegalitems/illegalitems_b.js";
import { IllegalItemsA } from "../../penrose/TickEvent/illegalitems/illegalitems_a.js";
import { IllegalItemsC } from "../../penrose/TickEvent/illegalitems/illegalitems_c.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiILLEGALITEMS(illegalitemsResult: ModalFormResponse, player: Player) {
    if (!illegalitemsResult || illegalitemsResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [IllegalItemsAToggle, IllegalItemsBToggle, IllegalItemsCToggle, IllegalEnchanmentsToggle, IllegalLoreToggle, IllegalStackBanToggle] = illegalitemsResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Illegal Items`);
    }
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");
    const illegalItemsBBoolean = dynamicPropertyRegistry.get("illegalitemsb_b");
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");
    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b");
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");

    if (IllegalItemsAToggle === true && illegalItemsABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsa_b", true);
        world.setDynamicProperty("illegalitemsa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalItemsA§f!`);
        IllegalItemsA();
    }
    if (IllegalItemsAToggle === false && illegalItemsABoolean === true) {
        dynamicPropertyRegistry.set("illegalitemsa_b", false);
        world.setDynamicProperty("illegalitemsa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalItemsA§f!`);
    }
    if (IllegalItemsBToggle === true && illegalItemsBBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsb_b", true);
        world.setDynamicProperty("illegalitemsb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalItemsB§f!`);
        IllegalItemsB();
    }
    if (IllegalItemsBToggle === false && illegalItemsBBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsb_b", false);
        world.setDynamicProperty("illegalitemsb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalItemsB§f!`);
    }
    if (IllegalItemsCToggle === true && illegalItemsCBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsc_b", true);
        world.setDynamicProperty("illegalitemsc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalItemsC§f!`);
        IllegalItemsC();
    }
    if (IllegalItemsCToggle === false && illegalItemsABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsc_b", false);
        world.setDynamicProperty("illegalitemsc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalItemsC§f!`);
    }
    if (IllegalEnchanmentsToggle === true && illegalEnchantmentBoolean === false) {
        dynamicPropertyRegistry.set("illegalenchantment_b", true);
        world.setDynamicProperty("illegalenchantment_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalEnchantments§f!`);
    }
    if (IllegalEnchanmentsToggle === false && illegalEnchantmentBoolean === true) {
        dynamicPropertyRegistry.set("illegalenchantment_b", false);
        world.setDynamicProperty("illegalenchantment_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalEnchantments§f!`);
    }
    if (IllegalLoreToggle === true && illegalLoresBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegallores_b", true);
        world.setDynamicProperty("illegallores_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalLores§f!`);
    }
    if (IllegalLoreToggle === false && illegalLoresBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegallores_b", false);
        world.setDynamicProperty("illegallores_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalLores§f!`);
    }
    //Check to make sure that Illegal Items are on
    if (!IllegalItemsAToggle === true && !IllegalItemsAToggle === true && !IllegalItemsBToggle === true && IllegalStackBanToggle === true) {
        // Turn it off just incase!
        dynamicPropertyRegistry.set("stackban_b", false);
        world.setDynamicProperty("stackban_b", false);
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to enable Illegal Items to use this feature.`);
        return paradoxui(player);
    }

    if (IllegalStackBanToggle === true && stackBanBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("stackban_b", true);
        world.setDynamicProperty("stackban_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6StackBans§f!`);
    }
    if (IllegalStackBanToggle === false && stackBanBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("stackban_b", false);
        world.setDynamicProperty("stackban_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4StackBans§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
