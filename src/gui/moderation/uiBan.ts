import { Player, world, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";
//import config from "../../data/config.js";

export function uiBAN(banResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, textField] = banResult.formValues;
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
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to Ban a player.`);
    }

    //make sure the player doesnt ban themselfs
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot ban yourself.`);
    }
    // Make sure the reason is not blank.
    if (!textField) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You must include a reaason for the ban!.`);
        return paradoxui(player);
    }

    try {
        member.addTag("Reason:" + textField);
        member.addTag("By:" + player.nameTag);
        member.addTag("isBanned");
    } catch (error) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to ban that player! Error: ${error}`);
        return paradoxui(player);
    }
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has banned ${member.nameTag}§r. Reason: ${textField}`);
    return paradoxui(player);
}
