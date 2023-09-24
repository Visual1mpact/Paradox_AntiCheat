import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiNOTIFY(notifyResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!notifyResult || notifyResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [value, Enabled] = notifyResult.formValues;
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to enable Notifications.`);
    }
    if (Enabled === true) {
        try {
            if (member.hasTag("nonotify")) {
                member.removeTag("nonotify");
            }
            member.addTag("notify");
        } catch (error) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Something went wrong! Error: ${error}`);
            paradoxui(player);
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled notifications.`);
        paradoxui(player);
    }
    if (Enabled === false) {
        try {
            if (member.hasTag("notify")) {
                member.removeTag("notify");
            }
            member.addTag("nonotify");
        } catch (error) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Something went wrong! Error: ${error}`);
            paradoxui(player);
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled notifications.`);
        paradoxui(player);
    }
    return paradoxui(player);
}
