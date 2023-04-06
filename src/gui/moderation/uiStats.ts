import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { getGamemode } from "../../util";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiSTATS(statsResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = statsResult.formValues;

    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r The player is not online.`);
    }

    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }

    const scores = [
        "autoclickervl",
        "badpacketsvl",
        "killauravl",
        "flyvl",
        "illegalitemsvl",
        "interactusevl",
        "cbevl",
        "gamemodevl",
        "autototemvl",
        "spammervl",
        "namespoofvl",
        "noslowvl",
        "crashervl",
        "reachvl",
        "invmovevl",
        "invalidsprintvl",
        "armorvl",
        "antikbvl",
    ];

    const reportBody = [
        `§6All Stats for ${member.name}§r\n\n`,
        `§6${member.name}§r is in Gamemode: ${getGamemode(member)}\n`,
        `§6${member.name}§r is currently at X= ${member.location.x.toFixed(0)} Y= ${member.location.y.toFixed(0)} Z= ${member.location.z.toFixed(0)}\n`,
    ];

    scores.forEach((score) => {
        try {
            const objective = world.scoreboard.getObjective(score);
            const playerScore = member.scoreboard.getScore(objective);
            if (playerScore > 0) {
                reportBody.push(`§r§4[§6${score.replace("vl", "").toUpperCase()}§4]§r number of Violations: ${playerScore}\n`);
            }
        } catch {
            // Ignore since this score doesn't exist for this player yet.
        }
    });

    const ResultsUI = new ActionFormData();
    ResultsUI.title("§4Paradox - Report for §4" + member.name);
    let tempstring = reportBody.toString().replaceAll(",", "");
    ResultsUI.body(tempstring);
    ResultsUI.button("Close");
    ResultsUI.show(player).then(() => {
        //Simply re show the main UI
        return paradoxui(player);
    });
    return player;
}
