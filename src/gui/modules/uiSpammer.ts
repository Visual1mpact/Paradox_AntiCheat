import { Player, world, SpammerA, SpammerB, SpammerC, SpammerD, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiSPAMMER(spamResult: ModalFormResponse, player: Player) {
    const [SpammerAToggle, SpammerBToggle, SpammerCToggle, SpammerDToggle] = spamResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Spammer`);
    }
    if (SpammerAToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("spammera_b", true);
        world.setDynamicProperty("spammera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerA§r!`);
        SpammerA();
    }
    if (SpammerAToggle === false) {
        //Deny
        dynamicPropertyRegistry.set("spammera_b", false);
        world.setDynamicProperty("spammera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerA§r!`);
    }
    if (SpammerBToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("spammerb_b", true);
        world.setDynamicProperty("spammerb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerB§r!`);
        SpammerB();
    }
    if (SpammerBToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("spammerb_b", false);
        world.setDynamicProperty("spammerb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerB§r!`);
    }
    if (SpammerCToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("spammerc_b", true);
        world.setDynamicProperty("spammerc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerC§r!`);
        SpammerC();
    }
    if (SpammerCToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("spammerc_b", false);
        world.setDynamicProperty("spammerc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerC§r!`);
    }
    if (SpammerDToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("spammerd_b", true);
        world.setDynamicProperty("spammerd_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerD§r!`);
        SpammerD();
    }
    if (SpammerDToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("spammerd_b", false);
        world.setDynamicProperty("spammerd_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerD§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
