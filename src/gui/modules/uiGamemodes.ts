import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { Adventure } from "../../penrose/tickevent/gamemode/adventure.js";
import { Creative } from "../../penrose/tickevent/gamemode/creative.js";
import { Survival } from "../../penrose/tickevent/gamemode/survival.js";

export function uiGAMEMODES(gamemodeResult: ModalFormResponse, player: Player) {
    const [AdventureGM, CreativeGM, SurvivalGM] = gamemodeResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (AdventureGM === true && CreativeGM === true && SurvivalGM === true) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cant disable all gamemodes!`);
    }
    //Adventure gamemode
    if (AdventureGM === true) {
        // Allow
        dynamicPropertyRegistry.set("adventuregm_b", true);
        world.setDynamicProperty("adventuregm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (survivalGMBoolean === true && creativeGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disallowed §4Gamemode 2 (Adventure)§r to be used!`);
        Adventure();
    }
    if (AdventureGM === false) {
        // Deny
        dynamicPropertyRegistry.set("adventuregm_b", false);
        world.setDynamicProperty("adventuregm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has allowed §6Gamemode 2 (Adventure)§r to be used!`);
    }
    //Creative gamemode
    if (CreativeGM === true) {
        // Allow
        dynamicPropertyRegistry.set("creativegm_b", true);
        world.setDynamicProperty("creativegm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && survivalGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disallowed §4Gamemode 1 (Creative)§r to be used!`);
        Creative();
    }
    if (CreativeGM === false) {
        // Deny
        dynamicPropertyRegistry.set("creativegm_b", false);
        world.setDynamicProperty("creativegm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has allowed §6Gamemode 1 (Creative)§r to be used!`);
    }
    if (SurvivalGM === true) {
        // Allow
        dynamicPropertyRegistry.set("survivalgm_b", true);
        world.setDynamicProperty("survivalgm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && creativeGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disallowed §4Gamemode 0 (Survival)§r to be used!`);
        Survival();
    }
    if (SurvivalGM === false) {
        // Deny
        dynamicPropertyRegistry.set("survivalgm_b", false);
        world.setDynamicProperty("survivalgm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has allowed §6Gamemode 0 (Survival)§r to be used!`);
    }

    //show the main ui to the player one complete.
    return paradoxui(player);
}
