import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { KillAura } from "../../penrose/EntityHitAfterEvent/killaura";

export async function uiANTIKILLAURA(antikillauraResult: ModalFormResponse, player: Player) {
    const [AntiKillAuraToggle] = antikillauraResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Killaura`);
    }
    if (AntiKillAuraToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antikillaura_b", false);
        world.setDynamicProperty("antikillaura_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4AntiKillAura§r!`);
    } else if (AntiKillAuraToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antikillaura_b", true);
        world.setDynamicProperty("antikillaura_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6AntiKillAura§r!`);
        KillAura();
    }
    //show the main ui to the player once complete.
    return paradoxui(player);
}
