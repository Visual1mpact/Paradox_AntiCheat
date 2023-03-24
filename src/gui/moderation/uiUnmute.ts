import { Player, world, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";
//import config from "../../data/config.js";

export async function uiUNMUTE(muteResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, reason] = muteResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to mute players!.`);
    }

    // If muted then un tag
    if (member.hasTag("isMuted")) {
        member.removeTag("isMuted");
    } else {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This player is already unmuted.`);
    }
    // If Education Edition is enabled then legitimately unmute them
    try {
        await member.runCommandAsync(`ability @s mute false`);
    } catch (error) {}
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You have been unmuted. Reason: ${reason}`);
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has unmuted ${member.nameTag}§r. Reason: ${reason}`);
    return paradoxui(player);
}
