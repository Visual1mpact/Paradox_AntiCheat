import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiNOTIFY(notifyResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, Enabled] = notifyResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to enable Notifications.`);
    }
    if (Enabled === true) {
        try {
            if (member.hasTag("nonotify")) {
                member.removeTag("nonotify");
            }
            member.addTag("notify");
        } catch (error) {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
            paradoxui(player);
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled notifications.`);
        paradoxui(player);
    }
    if (Enabled === false) {
        try {
            if (member.hasTag("notify")) {
                member.removeTag("notify");
            }
            member.addTag("nonotify");
        } catch (error) {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
            paradoxui(player);
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled notifications.`);
        paradoxui(player);
    }
    return paradoxui(player);
}
