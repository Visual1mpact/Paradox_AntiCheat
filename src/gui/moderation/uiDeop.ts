import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";
import { crypto, sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

//Function provided by Visual1mpact
export function uiDEOP(opResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = opResult.formValues;
    // Need player object
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Check for hash/salt and validate password from member
    const memberHash = member.getDynamicProperty("hash");
    const memberSalt = member.getDynamicProperty("salt");
    const memberEncode: string = crypto(memberSalt, config.modules.encryption.password) ?? null;

    if (memberHash !== undefined && memberHash === memberEncode) {
        member.removeDynamicProperty("hash");
        member.removeDynamicProperty("salt");
        dynamicPropertyRegistry.delete(member.id);
        member.removeTag("paradoxOpped");
        if (player.name !== member.name) {
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${member.nameTag}§r is no longer Paradox-Opped.`);
        }
        sendMsgToPlayer(member, `r§4[§6Paradox§4]§r Your OP status has been revoked!`);
        return paradoxui(player);
    }
    sendMsgToPlayer(player, `r§4[§6Paradox§4]§r ${member.name} Did not have Op permissions.`);
    return paradoxui(player);
}
