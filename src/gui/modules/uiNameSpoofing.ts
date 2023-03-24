import { Player, world, NamespoofA, NamespoofB, dynamicPropertyRegistry, sendMsg, sendMsgToPlayer, paradoxui } from "../../index";
import { ModalFormResponse } from "../../gui_index";

export function uiNAMESPOOFING(namespoofingResult: ModalFormResponse, player: Player) {
    const [NameSpoofAToggle, NameSpoofBToggle] = namespoofingResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Get Dynamic Property Boolean

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Name Spoofing`);
    }
    if (NameSpoofAToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("namespoofa_b", true);
        world.setDynamicProperty("namespoofa_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6NamespoofA§r!`);
        NamespoofA();
    }
    if (NameSpoofAToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("namespoofa_b", false);
        world.setDynamicProperty("namespoofa_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4NamespoofA§r!`);
    }
    if (NameSpoofBToggle === true) {
        // Allow
        dynamicPropertyRegistry.set("namespoofb_b", true);
        world.setDynamicProperty("namespoofb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6NamespoofB§r!`);
        NamespoofB;
    }
    if (NameSpoofBToggle === false) {
        // Deny
        dynamicPropertyRegistry.set("namespoofb_b", false);
        world.setDynamicProperty("namespoofb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4NamespoofB§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
