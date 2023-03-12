import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiCHATRANKS(notifyResult: ModalFormResponse, onlineList: string[], predefinedrank: string[], player: Player) {
    const [value, predefinedrankvalue, customrank] = notifyResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to enable Notifications.`);
    }
    if (!customrank) {
        try {
            let memberscurrentags = member.getTags();
            let custom: string;
            memberscurrentags.forEach((t) => {
                if (t.startsWith("Rank:")) {
                    custom = t;
                }
            });
            if (member.hasTag(custom)) {
                member.removeTag(custom);
            }
        } catch (error) {
            //This will throw if the player has no tags
            //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
        }
        member.addTag("Rank:" + predefinedrank[predefinedrankvalue]);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has updated ${member.nameTag} Rank.`);
        return paradoxui(player);
    }
    if (customrank) {
        try {
            let memberscurrentags = member.getTags();
            let custom: string;
            memberscurrentags.forEach((t) => {
                if (t.startsWith("Rank:")) {
                    custom = t;
                }
            });
            if (member.hasTag(custom)) {
                member.removeTag(custom);
            }
        } catch (error) {
            // This will throw if the player has no tags that match.
            //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
        }
        member.addTag("Rank:" + customrank);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has updated ${member.nameTag} Rank.`);
        return paradoxui(player);
    }
    return paradoxui;
}
