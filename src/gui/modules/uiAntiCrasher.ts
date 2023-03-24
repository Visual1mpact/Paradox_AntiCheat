import { Player, world, CrasherA, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiANTICRASHER(anticrasherResult: ModalFormResponse, player: Player) {
    const [AntiCrasherToggle] = anticrasherResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Crasher`);
    }
    if (AntiCrasherToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("crashera_b", true);
        world.setDynamicProperty("crashera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6CrasherA§r!`);
        CrasherA();
    }
    if (AntiCrasherToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("crashera_b", false);
        world.setDynamicProperty("crashera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4CrasherA§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
