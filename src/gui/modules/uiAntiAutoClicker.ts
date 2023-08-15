import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { AutoClicker } from "../../penrose/EntityHitEntityAfterEvent/autoclicker";

export async function uiANTIAUTOCLICKER(antiautoclickerResult: ModalFormResponse, player: Player) {
    const [AntiAutoClickerToggle] = antiautoclickerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Auto Clicker`);
    }
    if (AntiAutoClickerToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("autoclicker_b", true);
        world.setDynamicProperty("autoclicker_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6AutoClicker§f!`);
        AutoClicker();
    }
    if (AntiAutoClickerToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("autoclicker_b", false);
        world.setDynamicProperty("autoclicker_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4AutoClicker§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
