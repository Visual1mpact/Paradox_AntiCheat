import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { getGamemode } from "../../commands/utility/getGamemode.js";
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
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }
    //scores
    let getScoreAutoClicker: number = 0;
    let getScoreBadpackets1: number = 0;
    let getScoreKillaura: number = 0;
    let getScoreFlya: number = 0;
    let getScoreIllegalItemsa: number = 0;
    let getScoreKillauraA: number = 0;
    let getScoreNoSlowA: number = 0;
    let getScoreCBE: number = 0;
    let getScoreGameModeChange: number = 0;
    let getScoreAutoTotem: number = 0;
    let getScoreSpammer: number = 0;
    let getScoreNameSpoof: number = 0;
    let getScoreCrasher: number = 0;
    let getScoreReach: number = 0;
    let getScoreInventoryMods: number = 0;
    let getScoreInvalidSprint: number = 0;
    let getScoreEnchantedArmor: number = 0;
    let getScoreAntiKnockBack: number = 0;
    //Try getting the scores the script will stop if the target doesnt have a score for that objective.
    let ScoreboardObjectivesValues = world.scoreboard.getObjectives();
    const Violations: string[] = [
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
    // build the report body for the ui.
    let reportBody = ["§6All Stats for " + member.name + "§r" + "\n" + "\n"];
    // get the target players gamemode
    console.log("calling getGamemode(member)");
    let MembersGamemode = getGamemode(member);
    console.log(MembersGamemode);
    reportBody.push("§6" + member.name + "§r is in Gamemode: " + MembersGamemode + "\n");
    //get the target players coords
    reportBody.push("§6" + member.name + "§r is currently at X= " + member.location.x.toFixed(0) + " Y= " + member.location.y.toFixed(0) + " Z= " + member.location.z.toFixed(0) + "\n");
    for (let i = 0; i < ScoreboardObjectivesValues.length; i++) {
        if (ScoreboardObjectivesValues[i].getParticipants().find((pT) => pT.displayName == member.name) && Violations.includes(ScoreboardObjectivesValues[i].displayName)) {
            let tempscore = member.scoreboard.getScore(world.scoreboard.getObjective(ScoreboardObjectivesValues[i].displayName));
            if (ScoreboardObjectivesValues[i].displayName.includes("autoclickervl")) {
                getScoreAutoClicker = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6AutoClicker§4]§r number of Violations: " + getScoreAutoClicker + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("badpacketsvl")) {
                getScoreBadpackets1 = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Badpackets§4]§r number of Violations: " + getScoreBadpackets1 + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("killauravl")) {
                getScoreKillaura = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Killaura§4]§r number of Violations: " + getScoreKillaura + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("flyvl")) {
                getScoreFlya = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6FlyaA§4]§r number of Violations: " + getScoreFlya + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("illegalitemsvl")) {
                getScoreIllegalItemsa = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6IllegalItemsA§4]§r number of Violations: " + getScoreIllegalItemsa + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("interactusevl")) {
                getScoreKillauraA = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6KillauraA§4]§r number of Violations: " + getScoreKillauraA + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("noslowvl")) {
                getScoreNoSlowA = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6NoSlowA§4]§r§r number of Violations: " + getScoreNoSlowA + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("cbevl")) {
                getScoreCBE = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6CBE§4]§r§r number of Violations: " + getScoreCBE + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("gamemodevl")) {
                getScoreGameModeChange = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Gamemode Change§4]§r§r number of Violations: " + getScoreGameModeChange + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("autototemvl")) {
                getScoreAutoTotem = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6AutoTotem§4]§r§r number of Violations: " + getScoreAutoTotem + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("spammervl")) {
                getScoreSpammer = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Spammer§4]§r§r number of Violations: " + getScoreSpammer + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("namespoofvl")) {
                getScoreNameSpoof = tempscore;
                reportBody.push("§r§4[§6Namespoof§4]§r§r number of Violations: " + getScoreNameSpoof + "\n");
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("crashervl")) {
                getScoreCrasher = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Crasher§4]§r§r number of Violations: " + getScoreCrasher + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("reachvl")) {
                getScoreReach = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6Reach§4]§r§r number of Violations: " + getScoreReach + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("invmovevl")) {
                getScoreInventoryMods = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6InventoryMods§4]§r§r number of Violations: " + getScoreInventoryMods + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("invalidsprintvl")) {
                getScoreInvalidSprint = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6InvalidSprint§4]§r§r number of Violations: " + getScoreInvalidSprint + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("armorvl")) {
                getScoreEnchantedArmor = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6EnchantedArmor§4]§r§r number of Violations: " + getScoreEnchantedArmor + "\n");
                }
            }
            if (ScoreboardObjectivesValues[i].displayName.includes("antikbvl")) {
                getScoreAntiKnockBack = tempscore;
                if (tempscore > 0) {
                    reportBody.push("§r§4[§6AntiKnockback§4]§r§r number of Violations: " + getScoreAntiKnockBack + "\n");
                }
            }
        }
    }

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
