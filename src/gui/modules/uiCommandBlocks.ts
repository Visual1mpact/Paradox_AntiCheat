import { Player } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiCOMMANDBLOCKS(commandblocksResult: ModalFormResponse, player: Player) {
    const [CommandBlockOverrideToggle, RemoveCommandBlocksToggle] = commandblocksResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (CommandBlockOverrideToggle === true) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config cmds 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set CommandBlocksEnabled as §6enabled§r!`);
    }
    if (CommandBlockOverrideToggle === false) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config cmds 2`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set CommandBlocksEnabled as §4disabled§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a cmds = paradox:config cmds`);
    if (RemoveCommandBlocksToggle === true) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config commandblocks 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Command Blocks§r!`);
    }
    if (RemoveCommandBlocksToggle === false) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config commandblocks 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Command Blocks§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a commandblocks = paradox:config commandblocks`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
