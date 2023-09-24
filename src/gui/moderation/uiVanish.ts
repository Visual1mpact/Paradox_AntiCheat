import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index.js";

/**
 * Handles the result of a modal form used for toggling player vanish mode.
 *
 * @name uiVANISH
 * @param {ModalFormResponse} vanishResult - The result of the player vanish mode toggle modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the player vanish mode toggle modal form.
 */
export function uiVANISH(vanishResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIVanish(vanishResult, onlineList, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleUIVanish(vanishResult: ModalFormResponse, onlineList: string[], player: Player) {
    if (!vanishResult || vanishResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }
    if (member.hasTag("vanish")) {
        member.addTag("novanish");
    }

    if (member.hasTag("novanish")) {
        member.removeTag("vanish");
    }

    if (member.hasTag("novanish")) {
        member.triggerEvent("unvanish");
        // Remove effects
        const effectsToRemove = [MinecraftEffectTypes.Invisibility, MinecraftEffectTypes.NightVision];

        for (const effectType of effectsToRemove) {
            player.removeEffect(effectType);
        }
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are no longer vanished.`);
        sendMsg(`@a[tag=paradoxOpped]`, `§7${member.name}§f is no longer in vanish.`);
    }

    if (!member.hasTag("novanish")) {
        member.addTag("vanish");
    }

    if (member.hasTag("vanish") && !member.hasTag("novanish")) {
        member.triggerEvent("vanish");
        sendMsgToPlayer(member, `§f§4[§6Paradox§4]§f You are now vanished!`);
        sendMsg(`@a[tag=paradoxOpped]`, `§7${member.name}§f is now vanished!`);
    }

    if (member.hasTag("novanish")) {
        member.removeTag("novanish");
    }

    return paradoxui(player);
}
