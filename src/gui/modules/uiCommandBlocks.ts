import { Player } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getScore, sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

/**
 * Handles the result of a modal form used for toggling command blocks mode.
 *
 * @name uiCOMMANDBLOCKS
 * @param {ModalFormResponse} commandblocksResult - The result of the command blocks mode toggle modal form.
 * @param {Player} player - The player who triggered the command blocks mode toggle modal form.
 */
export function uiCOMMANDBLOCKS(commandblocksResult: ModalFormResponse, player: Player) {
    handleUICommandBlocks(commandblocksResult, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleUICommandBlocks(commandblocksResult: ModalFormResponse, player: Player) {
    const [CommandBlockOverrideToggle, RemoveCommandBlocksToggle] = commandblocksResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    //get the current scores
    const cmdsscore = getScore("cmds", player);
    const commandblocksscore = getScore("commandblocks", player);
    let removecmdblocksBoolean;
    Boolean;
    let cmdoBoolean: boolean;
    if (cmdsscore <= 0) {
        cmdoBoolean = false;
    }
    if (cmdsscore >= 1) {
        cmdoBoolean = true;
    }
    if (commandblocksscore <= 0) {
        removecmdblocksBoolean = false;
    }
    if (commandblocksscore >= 1) {
        removecmdblocksBoolean = true;
    }

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Command Blocks`);
    }
    if (CommandBlockOverrideToggle === true && cmdoBoolean === false) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config cmds 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has set CommandBlocksEnabled as §6enabled§f!`);
    }
    if (CommandBlockOverrideToggle === false && cmdoBoolean === true) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config cmds 2`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has set CommandBlocksEnabled as §4disabled§f!`);
    }
    player.runCommand(`scoreboard players operation @a cmds = paradox:config cmds`);
    if (RemoveCommandBlocksToggle === true && removecmdblocksBoolean === false) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config commandblocks 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6Anti Command Blocks§f!`);
    }
    if (RemoveCommandBlocksToggle === false && removecmdblocksBoolean === true) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config commandblocks 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4Anti Command Blocks§f!`);
    }
    player.runCommand(`scoreboard players operation @a commandblocks = paradox:config commandblocks`);
    //show the main ui to the player once complete.
    return paradoxui(player);
}
