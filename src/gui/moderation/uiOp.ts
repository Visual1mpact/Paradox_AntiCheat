import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { crypto, sendMsg, sendMsgToPlayer, UUID } from "../../util";
import { paradoxui } from "../paradoxui.js";

//Function provided by Visual1mpact
export function uiOP(opResult: ModalFormResponse, salt: string | number | boolean, hash: string | number | boolean, encode: string, onlineList: string[], player: Player) {
    const [value] = opResult.formValues;
    if (hash !== encode) {
        if (value === config.modules.encryption.password) {
            // If no salt then create one
            if (salt === undefined) {
                player.setDynamicProperty("salt", UUID.generate());
                salt = player.getDynamicProperty("salt");
            }
            // If no hash then create one
            if (hash === undefined) {
                encode = crypto?.(salt, config?.modules?.encryption?.password);
                player.setDynamicProperty("hash", encode);
                dynamicPropertyRegistry.set(player.id, player.name);
                hash = player.getDynamicProperty("hash");
            } else {
                encode = crypto?.(salt, config?.modules?.encryption?.password);
            }
            if (hash === encode) {
                sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r is now Paradox-Opped.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are now op!`);
                player.addTag("paradoxOpped");
                paradoxui(player);
            } else {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong.`);
                paradoxui(player);
            }
        } else {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Wrong password!`);
            paradoxui(player);
        }
    } else {
        // Need player object
        let member: Player = undefined;
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
        // Check for hash/salt and validate password
        const memberHash = member.getDynamicProperty("hash");
        let memberSalt = member.getDynamicProperty("salt");
        const encode = crypto(memberSalt, config.modules.encryption.password) ?? null;
        // If no salt then create one
        if (memberSalt === undefined) {
            member.setDynamicProperty("salt", UUID.generate());
            // Get generated salt
            memberSalt = member.getDynamicProperty("salt");
        }
        // If no hash then create one
        if (memberHash !== encode) {
            const encode = crypto(memberSalt, config.modules.encryption.password);
            member.setDynamicProperty("hash", encode);
            dynamicPropertyRegistry.set(member.id, member.name);
        }
        sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You are now op!`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${member.name}§r is now Paradox-Opped.`);
        member.addTag("paradoxOpped");
        paradoxui(player);
    }
}
