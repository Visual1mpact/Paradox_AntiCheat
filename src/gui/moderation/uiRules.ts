import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { onJoinrules } from "../PlayerSpawnAfterEvent/rules/rules.js";

export function uiRULES(banResult: ModalFormResponse, player: Player) {
    const [EnabledRules, EnableKick] = banResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure the rules.`);
    }
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b");
    if (EnabledRules === true && showrulesBoolean === false) {
        dynamicPropertyRegistry.set("showrules_b", true);
        world.setDynamicProperty("showrules_b", true);
        //remember to call the function!
        onJoinrules();
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6showrules§r!`);
    }
    if (EnabledRules === false && showrulesBoolean === true) {
        dynamicPropertyRegistry.set("showrules_b", false);
        world.setDynamicProperty("showrules_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4showrules§r!`);
    }
    if (EnableKick === true && KickOnDeclineBoolean === false) {
        dynamicPropertyRegistry.set("kickondecline_b", true);
        world.setDynamicProperty("kickondecline_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §4KickOnDecline§r!`);
    }
    if (EnableKick === false && KickOnDeclineBoolean === true) {
        dynamicPropertyRegistry.set("kickondecline_b", false);
        world.setDynamicProperty("kickondecline_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4KickOnDecline§r!`);
    }

    //show the main ui to the player one complete.
    return paradoxui(player);
}
