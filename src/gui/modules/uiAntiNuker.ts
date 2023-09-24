import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { BeforeNukerA } from "../../penrose/PlayerBreakBlockBeforeEvent/nuker/nuker_a.js";

export function uiANTINUKER(antinukerResult: ModalFormResponse, player: Player) {
    if (!antinukerResult || antinukerResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [AntiNukerToggle] = antinukerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Anti Nuker`);
    }
    if (AntiNukerToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antinukera_b", true);
        world.setDynamicProperty("antinukera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6AntiNukerA§f!`);
        BeforeNukerA();
    }
    if (AntiNukerToggle === false) {
        dynamicPropertyRegistry.set("antinukera_b", false);
        world.setDynamicProperty("antinukera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4AntiNukerA§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
