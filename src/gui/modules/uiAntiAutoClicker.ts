import { Player, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export async function uiANTIAUTOCLICKER(antiautoclickerResult: ModalFormResponse, player: Player) {
    const [AntiAutoClickerToggle] = antiautoclickerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Auto Clicker`);
    }
    if (AntiAutoClickerToggle === true) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config autoclicker 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Autoclicker§r!`);
    }
    if (AntiAutoClickerToggle === false) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config autoclicker 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Autoclicker§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a autoclicker = paradox:config autoclicker`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
