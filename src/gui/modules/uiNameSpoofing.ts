import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { NamespoofA } from "../../penrose/TickEvent/namespoof/namespoof_a.js";
import { NamespoofB } from "../../penrose/TickEvent/namespoof/namespoof_b.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiNAMESPOOFING(namespoofingResult: ModalFormResponse, player: Player) {
    if (!namespoofingResult || namespoofingResult.canceled) {
        // Handle canceled form or undefined result
        return;
    }
    const [NameSpoofAToggle, NameSpoofBToggle] = namespoofingResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const nameSpoofABoolean = dynamicPropertyRegistry.get("namespoofa_b");
    const nameSpoofBBoolean = dynamicPropertyRegistry.get("namespoofb_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to configure Name Spoofing`);
    }
    if (NameSpoofAToggle === true && nameSpoofABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("namespoofa_b", true);
        world.setDynamicProperty("namespoofa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6NamespoofA§f!`);
        NamespoofA();
    }
    if (NameSpoofAToggle === false && nameSpoofABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("namespoofa_b", false);
        world.setDynamicProperty("namespoofa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4NamespoofA§f!`);
    }
    if (NameSpoofBToggle === true && nameSpoofBBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("namespoofb_b", true);
        world.setDynamicProperty("namespoofb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6NamespoofB§f!`);
        NamespoofB;
    }
    if (NameSpoofBToggle === false && nameSpoofBBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("namespoofb_b", false);
        world.setDynamicProperty("namespoofb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4NamespoofB§f!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
