import { Player, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export async function uiANTIKILLAURA(antikillauraResult: ModalFormResponse, player: Player) {
    const [AntiKillAuraToggle] = antikillauraResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Killaura`);
    }
    if (AntiKillAuraToggle === true) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config autoaura 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Autoaura§r!`);
    }
    if (AntiKillAuraToggle === false) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config autoaura 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Autoaura§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a autoaura = paradox:config autoaura`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
