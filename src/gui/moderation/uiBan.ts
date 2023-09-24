import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
//import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiBAN(banResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!banResult || banResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [value, textField] = banResult.formValues;
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to Ban a player.`);
    }

    //make sure the player doesnt ban themselfs
    if (member === player) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You cannot ban yourself.`);
    }
    // Make sure the reason is not blank.
    if (!textField) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You must include a reaason for the ban!.`);
        return paradoxui(player);
    }

    try {
        member.addTag("Reason:" + textField);
        member.addTag("By:" + player.name);
        member.addTag("isBanned");
    } catch (error) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f I was unable to ban that player! Error: ${error}`);
        return paradoxui(player);
    }
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has banned §7${member.name}§f. Reason: §7${textField}§f`);
    return paradoxui(player);
}
