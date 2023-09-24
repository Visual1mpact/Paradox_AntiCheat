import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer, setTimer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiTPA(tpaResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!tpaResult || tpaResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [value, toggleToTarget, toggleTargetTo] = tpaResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }
    // Check to make sure they player hasnt enabled both options
    if (toggleTargetTo === true && toggleToTarget === true) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cant enable both options`);
        return paradoxui(player);
    }
    //check to make sure the player has enabled at least one option.
    if (toggleTargetTo === false && toggleToTarget === false) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You must enable one option.`);
        return paradoxui(player);
    }
    if (toggleToTarget === true) {
        // tp the op to the target
        // Let's teleport you to that player
        setTimer(player.id);
        player.teleport(member.location, { dimension: member.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        // Let you know that you have been teleported
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Teleported §7${player.name}§f to §7${member.name}§f`);
    }

    if (toggleTargetTo === true) {
        //tp the target to the op
        setTimer(member.id);
        member.teleport(player.location, { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Teleported §7${member.name}§f to §7${player.name}§f`);
    }

    return paradoxui(player);
}
