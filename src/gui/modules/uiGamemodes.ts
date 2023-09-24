import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { Adventure } from "../../penrose/TickEvent/gamemode/adventure.js";
import { Creative } from "../../penrose/TickEvent/gamemode/creative.js";
import { Survival } from "../../penrose/TickEvent/gamemode/survival.js";

export function uiGAMEMODES(gamemodeResult: ModalFormResponse, player: Player) {
    if (!gamemodeResult || gamemodeResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AdventureGM, CreativeGM, SurvivalGM] = gamemodeResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure gamemodes`);
    }
    if (AdventureGM === true && CreativeGM === true && SurvivalGM === true) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You can't disable all gamemodes!`);
    }
    //Adventure gamemode
    if (AdventureGM === true && adventureGMBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("adventuregm_b", true);
        world.setDynamicProperty("adventuregm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (survivalGMBoolean === true && creativeGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disallowed §4Gamemode 2 (Adventure)§f to be used!`);
        Adventure();
    }
    if (AdventureGM === false && adventureGMBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("adventuregm_b", false);
        world.setDynamicProperty("adventuregm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has allowed §6Gamemode 2 (Adventure)§f to be used!`);
    }
    //Creative gamemode
    if (CreativeGM === true && creativeGMBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("creativegm_b", true);
        world.setDynamicProperty("creativegm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && survivalGMBoolean === false) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disallowed §4Gamemode 1 (Creative)§f to be used!`);
        Creative();
    }
    if (CreativeGM === false && creativeGMBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("creativegm_b", false);
        world.setDynamicProperty("creativegm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has allowed §6Gamemode 1 (Creative)§f to be used!`);
    }
    if (SurvivalGM === true && survivalGMBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("survivalgm_b", true);
        world.setDynamicProperty("survivalgm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && creativeGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disallowed §4Gamemode 0 (Survival)§f to be used!`);
        Survival();
    }
    if (SurvivalGM === false && survivalGMBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("survivalgm_b", false);
        world.setDynamicProperty("survivalgm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has allowed §6Gamemode 0 (Survival)§f to be used!`);
    }

    //show the main ui to the player one complete.
    return paradoxui(player);
}
