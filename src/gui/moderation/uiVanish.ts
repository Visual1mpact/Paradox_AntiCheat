import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";

export async function uiVANISH(vanishResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = vanishResult.formValues;
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
    }
    if (member.hasTag("vanish")) {
        member.addTag("novanish");
    }

    if (member.hasTag("novanish")) {
        member.removeTag("vanish");
    }

    if (member.hasTag("novanish")) {
        member.triggerEvent("unvanish");
        member.runCommandAsync(`effect @s clear`);
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are no longer vanished.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is no longer in vanish.`);
    }

    if (!member.hasTag("novanish")) {
        member.addTag("vanish");
    }

    if (member.hasTag("vanish") && !member.hasTag("novanish")) {
        member.triggerEvent("vanish");
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are now vanished!`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is now vanished!`);
    }

    if (member.hasTag("novanish")) {
        member.removeTag("novanish");
    }

    return paradoxui(player);
}
