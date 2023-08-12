import { Player, world } from "@minecraft/server";
import { ActionFormResponse, ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { crypto, isValidUUID, sendMsg, sendMsgToPlayer, UUID } from "../../util";
import { paradoxui } from "../paradoxui.js";

//Function provided by Visual1mpact
export function uiOP(opResult: ModalFormResponse | ActionFormResponse, salt: string | number | boolean, hash: string | number | boolean, onlineList: string[], player: Player) {
    if (!hash || !salt || (hash !== crypto?.(salt, player.id) && isValidUUID(salt as string))) {
        if (!player.isOp()) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Operator to use this command.`);
            return paradoxui(player);
        }
    }

    if ("formValues" in opResult) {
        // It's a ModalFormResponse

        const [value] = opResult.formValues;

        // Try to find the player requested
        let targetPlayer: Player;

        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                targetPlayer = pl;
                break;
            }
        }

        if (targetPlayer) {
            const targetHash = targetPlayer.getDynamicProperty("hash");

            if (targetHash === undefined) {
                const targetSalt = UUID.generate();
                targetPlayer.setDynamicProperty("salt", targetSalt);

                const newHash = crypto?.(targetSalt, targetPlayer.id);

                targetPlayer.setDynamicProperty("hash", newHash);

                dynamicPropertyRegistry.set(targetPlayer.id, targetPlayer.name);

                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have granted Paradox-Op to ${targetPlayer.name}.`);
                sendMsgToPlayer(targetPlayer, `§f§4[§6Paradox§4]§f You are now op!`);
                sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${targetPlayer.name}§f is now Paradox-Opped.`);
                targetPlayer.addTag("paradoxOpped");
                return paradoxui(player);
            } else {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f ${targetPlayer.name} is already Paradox-Opped.`);
                return paradoxui(player);
            }
        } else {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Could not find player ${targetPlayer.name}.`);
            return paradoxui(player);
        }
    } else if ("selection" in opResult) {
        // It's an ActionFormResponse
        if (opResult.selection === 0) {
            // player wants to change their own password
            const targetSalt = UUID.generate();
            const newHash = crypto?.(targetSalt, player.id);

            player.setDynamicProperty("hash", newHash);
            player.setDynamicProperty("salt", targetSalt);
            player.addTag("paradoxOpped");

            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are now Paradox-Opped!`);

            dynamicPropertyRegistry.set(player.id, player.name);

            return paradoxui(player);
        }
        return paradoxui(player);
    } else {
        return paradoxui(player);
    }
}
