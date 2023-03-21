import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { BedrockValidate } from "../../penrose/tickevent/bedrock/bedrockvalidate.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiBEDROCKVALIDATION(bedrockvalidationResult: ModalFormResponse, player: Player) {
    const [BedrockValidationToggle] = bedrockvalidationResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure gamemodes`);
    }
    if (BedrockValidationToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("bedrockvalidate_b", true);
        world.setDynamicProperty("bedrockvalidate_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6BedrockValidate§r!`);
        BedrockValidate();
    }
    if (BedrockValidationToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("bedrockvalidate_b", false);
        world.setDynamicProperty("bedrockvalidate_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4BedrockValidate§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
