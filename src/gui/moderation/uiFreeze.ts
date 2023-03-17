import { MinecraftEffectTypes, Player, world } from "@minecraft/server";
import { TickFreeze } from "../../penrose/tickevent/freeze/freeze.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
export async function uiFREEZE(freezeResult, onlineList, player) {
    const [value] = freezeResult.formValues;
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

    // Make sure they don't freeze themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot freeze yourself.`);
    }
    //Make sure they don't freeze staff!
    if (member.hasTag("paradoxOpped")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot freeze Staff.`);
    }
    if (member.hasTag("freeze")) {
        member.addTag("nofreeze");
    }
    if (member.hasTag("nofreeze")) {
        member.removeTag("freeze");
    }
    if (member.hasTag("nofreeze")) {
        await member.runCommandAsync(`effect @s clear`);
        sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You are no longer frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.nameTag}§r is no longer frozen.`);
    }

    if (!member.hasTag("nofreeze")) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.blindness, 1000000, 255);
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.miningFatigue, 1000000, 255);
        // Weakness
        member.addEffect(MinecraftEffectTypes.weakness, 1000000, 255);
        // Slowness
        member.addEffect(MinecraftEffectTypes.slowness, 1000000, 255);
    }

    if (!member.hasTag("nofreeze")) {
        member.addTag("freeze");
        sendMsg(`@a[tag=paradoxOpped]`, `${member.nameTag}§r is now frozen.`);
        return TickFreeze(member);
    }

    if (member.hasTag("nofreeze")) {
        member.removeTag("nofreeze");
        return TickFreeze(member);
    }

    return paradoxui(player);
}
