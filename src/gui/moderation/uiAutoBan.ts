import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { AutoBan } from "../../penrose/TickEvent/ban/autoban.js";

export function uiAUTOBAN(autobanResult: ModalFormResponse, player: Player) {
    const [autobanToggle] = autobanResult.formValues;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    const autoBanBoolean = dynamicPropertyRegistry.get("autoban_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }
    if (autobanToggle === true && autoBanBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("autoban_b", true);
        world.setDynamicProperty("autoban_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6autoban§r!`);
        AutoBan();
    }
    if (autobanToggle === false && autoBanBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("autoban_b", false);
        world.setDynamicProperty("autoban_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4autoban§r!`);
    }

    return paradoxui(player);
}
