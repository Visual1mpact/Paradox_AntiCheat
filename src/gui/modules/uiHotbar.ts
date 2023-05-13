import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { Hotbar } from "../../penrose/tickevent/hotbar/hotbar.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

const configMessageBackup = new WeakMap();
// Dummy object
const dummy: object = [];

export function uiHOTBAR(hotbarResult: ModalFormResponse, player: Player) {
    const [HotbarMessage, HotbarToggle, HotbarRestDefaultMessageToggle] = hotbarResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure the hotbar`);
    }
    if (configMessageBackup.has(dummy) === false) {
        configMessageBackup.set(dummy, config.modules.hotbar.message);
    }
    if (HotbarToggle === true && HotbarRestDefaultMessageToggle === false) {
        // Allow
        dynamicPropertyRegistry.set("hotbar_b", true);
        world.setDynamicProperty("hotbar_b", true);
        config.modules.hotbar.message = HotbarMessage;
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has enabled §6Hotbar`);
        Hotbar();
    }
    if (HotbarToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("hotbar_b", false);
        world.setDynamicProperty("hotbar_b", false);
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has disabled §6Hotbar`);
    }
    if (HotbarToggle === false && HotbarRestDefaultMessageToggle === true) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable the hotbar toggle to reset the message!`);
        return paradoxui(player);
    }
    if (HotbarToggle === true && HotbarRestDefaultMessageToggle === true) {
        config.modules.hotbar.message = configMessageBackup.get(dummy);
        Hotbar();
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
