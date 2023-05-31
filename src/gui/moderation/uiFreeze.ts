import { Player, world } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { TickFreeze } from "../../penrose/TickEvent/freeze/freeze.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";
export async function uiFREEZE(freezeResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = freezeResult.formValues;
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
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§r is no longer frozen.`);
    }

    if (!member.hasTag("nofreeze")) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.Blindness, 1000000, { amplifier: 255, showParticles: true });
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.MiningFatigue, 1000000, { amplifier: 255, showParticles: true });
        // Weakness
        member.addEffect(MinecraftEffectTypes.Weakness, 1000000, { amplifier: 255, showParticles: true });
        // Slowness
        member.addEffect(MinecraftEffectTypes.Slowness, 1000000, { amplifier: 255, showParticles: true });
    }

    if (!member.hasTag("nofreeze")) {
        member.addTag("freeze");
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§r is now frozen.`);
        return TickFreeze(member);
    }

    if (member.hasTag("nofreeze")) {
        member.removeTag("nofreeze");
        return TickFreeze(member);
    }

    return paradoxui(player);
}
