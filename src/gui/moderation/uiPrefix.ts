import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
function resetPrefix(player: Player) {
    const sanitize = player.getTags();
    for (const tag of sanitize) {
        if (tag.startsWith("Prefix:")) {
            player.removeTag(tag);
            config.customcommands.prefix = "!";
        }
    }
    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix has been reset!`);
}

export function uiPREFIX(prefixResult: ModalFormResponse, onlineList, player: Player) {
    const [value, textField, toggle] = prefixResult.formValues;
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
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }
    if (textField.length && !toggle) {
        /**
         * Make sure we are not attempting to set a prefix that can break commands
         */
        if (textField === "/") {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Using prefix '/' is not allowed!`);
            return paradoxui;
        }

        // Change Prefix command under conditions
        if (textField.length <= 1 && textField.length >= 1) {
            resetPrefix(member);
            config.customcommands.prefix = textField;
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix has been changed to '${textField}'! for ${member.nameTag}`);
            member.addTag("Prefix:" + textField);
        } else {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix length cannot be more than 2 characters!`);
        }
    }

    // Reset has been toggled
    if (toggle) {
        resetPrefix(player);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix has been reset for ${member.nameTag}!`);
    }
    return paradoxui(player);
}
