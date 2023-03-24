import { Player, world, NukerA, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiANTINUKER(antinukerResult: ModalFormResponse, player: Player) {
    const [AntiNukerToggle] = antinukerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Nuker`);
    }
    if (AntiNukerToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antinukera_b", true);
        world.setDynamicProperty("antinukera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6AntiNukerA§r!`);
        NukerA();
    }
    if (AntiNukerToggle === false) {
        dynamicPropertyRegistry.set("antinukera_b", false);
        world.setDynamicProperty("antinukera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4AntiNukerA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
