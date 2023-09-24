import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { SpammerA } from "../../penrose/ChatSendBeforeEvent/spammer/spammer_a.js";
import { SpammerB } from "../../penrose/ChatSendBeforeEvent/spammer/spammer_b.js";
import { SpammerC } from "../../penrose/ChatSendBeforeEvent/spammer/spammer_c.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiSPAMMER(spamResult: ModalFormResponse, player: Player) {
    if (!spamResult || spamResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [SpammerAToggle, SpammerBToggle, SpammerCToggle] = spamResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");
    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b");
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Spammer`);
    }
    if (SpammerAToggle === true && spammerABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammera_b", true);
        world.setDynamicProperty("spammera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6SpammerA§f!`);
        SpammerA();
    }
    if (SpammerAToggle === false && spammerABoolean === true) {
        //Deny
        dynamicPropertyRegistry.set("spammera_b", false);
        world.setDynamicProperty("spammera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4SpammerA§f!`);
    }
    if (SpammerBToggle === true && spammerBBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerb_b", true);
        world.setDynamicProperty("spammerb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6SpammerB§f!`);
        SpammerB();
    }
    if (SpammerBToggle === false && spammerBBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("spammerb_b", false);
        world.setDynamicProperty("spammerb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4SpammerB§f!`);
    }
    if (SpammerCToggle === true && spammerCBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerc_b", true);
        world.setDynamicProperty("spammerc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6SpammerC§f!`);
        SpammerC();
    }
    if (SpammerCToggle === false && spammerCBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("spammerc_b", false);
        world.setDynamicProperty("spammerc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4SpammerC§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
