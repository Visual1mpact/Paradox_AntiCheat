import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiTPA(banResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, toggleToTarget, toggleTargetTo] = banResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }
    // Check to make sure they player hasnt enabled both options
    if (toggleTargetTo === true && toggleToTarget === true) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cant enable both options`);
        return paradoxui(player);
    }
    //check to make sure the player has enabled at least one option.
    if (toggleTargetTo === false && toggleToTarget === false) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You must enable one option.`);
        return paradoxui(player);
    }
    if (toggleToTarget === true) {
        // tp the op to the target
        // Let's teleport you to that player
        player.teleport(member.location, member.dimension, 0, 0);
        // Let you know that you have been teleported
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported ${player.name} to ${member.name}`);
    }

    if (toggleTargetTo === true) {
        //tp the target to the op
        member.teleport(player.location, member.dimension, 0, 0);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported ${member.name} to ${player.name}`);
    }

    return paradoxui(player);
}