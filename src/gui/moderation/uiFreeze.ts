import { Player, world } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";

/**
 * Handles the result of a modal form used for toggling freeze mode.
 *
 * @name uiFREEZE
 * @param {ModalFormResponse} freezeResult - The result of the freeze mode toggle modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the freeze mode toggle modal form.
 */
export function uiFREEZE(freezeResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIFreeze(freezeResult, onlineList, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleUIFreeze(freezeResult: ModalFormResponse, onlineList: string[], player: Player) {
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }

    const boolean = member.hasTag("paradoxFreeze");

    if (boolean) {
        member.removeTag("paradoxFreeze");
        member.runCommand(`effect @s clear`);
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are no longer frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is no longer frozen.`);
        return;
    }

    if (!boolean) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.Blindness, 1000000, { amplifier: 255, showParticles: true });
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.MiningFatigue, 1000000, { amplifier: 255, showParticles: true });
        // Weakness
        member.addEffect(MinecraftEffectTypes.Weakness, 1000000, { amplifier: 255, showParticles: true });
        // Slowness
        member.addEffect(MinecraftEffectTypes.Slowness, 1000000, { amplifier: 255, showParticles: true });
        member.addTag("paradoxFreeze");
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are now frozen.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${member.name}§f is now frozen.`);
        return;
    }

    return paradoxui(player);
}
