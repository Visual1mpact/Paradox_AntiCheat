import { Player } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { queueUnban } from "../../commands/moderation/unban.js";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiUNBAN(unbanResult: ModalFormResponse, player: Player) {
    const [textField, deleteUnban] = unbanResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to Ban a player.`);
    }
    if (deleteUnban === true) {
        queueUnban.delete(textField);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${textField} has been removed from the unban queue!`);
    }
    // Add player to queue
    queueUnban.add(textField);
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${textField} is queued to be unbanned!`);
    return paradoxui(player);
}
