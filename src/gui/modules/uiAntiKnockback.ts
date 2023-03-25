import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { AntiKnockbackA } from "../../penrose/tickevent/knockback/antikb_a.js";

export async function uiANTIKNOCKBACK(antiknockbackResult: ModalFormResponse, player: Player) {
    const [AntiKnockBackToggle] = antiknockbackResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Anti Knockback`);
    }

    if (AntiKnockBackToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("antikb_b", true);
        world.setDynamicProperty("antikb_b", true);
        await player.runCommandAsync(`scoreboard players set paradox:config antikb 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Knockback§r!`);
        AntiKnockbackA();
    }
    if (AntiKnockBackToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("antikb_b", false);
        world.setDynamicProperty("antikb_b", false);
        await player.runCommandAsync(`scoreboard players set paradox:config antikb 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Knockback§r!`);
    }
    await player.runCommandAsync(`scoreboard players operation @a antikb = paradox:config antikb`);

    //show the main ui to the player once complete.
    return paradoxui(player);
}
