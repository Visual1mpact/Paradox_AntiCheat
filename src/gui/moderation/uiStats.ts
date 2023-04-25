import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { getGamemode, getScore } from "../../util";
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

    const uniqueId = dynamicPropertyRegistry.get(player?.id);
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
        `§6${member.name}§r is currently at §4X= ${member.location.x.toFixed(0)} §2Y= ${member.location.y.toFixed(0)} §3Z= ${member.location.z.toFixed(0)}\n`,
        `§r§4--------------------------------§r\n`,
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
    // Define the armor types and materials you want to loop through
    const armorTypes = ["Helmet", "Chest", "Leggings", "Boots"];
    const armorMaterials = ["§7Leather", "§fChain", "§fIron", "§6Gold", "§bDiamond", "§8Netherite"];
    const enchantedArmorScores = [
        { type: "helmet", score: "ench_helmet" },
        { type: "chest", score: "ench_chest" },
        { type: "leggings", score: "ench_leggings" },
        { type: "boots", score: "ench_boots" },
    ];

    // Loop through all possible combinations of armor types and materials
    for (const armorType of armorTypes) {
        let materialArray = armorMaterials;

        // Check if the current armor piece is a chest or helmet
        if (armorType === "Chest" || armorType === "Helmet") {
            // Select either "§7Elytra" or "§2Turtle Shell" depending on the armor type
            const materialString = armorType === "Chest" ? "§7Elytra" : "§2Turtle Shell";

            // Replace the last element of the array with the selected material string
            materialArray = armorMaterials.concat(materialString);
        }

        // Determine if the current armor piece is enchanted or not
        let isEnchanted = false;
        const objective = enchantedArmorScores.find((a) => a.type === armorType.toLowerCase()).score;
        const materialObjective = `detect_${armorType.toLowerCase()}`;
        const armorScore = getScore(objective, player);
        const materialScore = getScore(materialObjective, player);

        if (armorScore > 0) {
            isEnchanted = true;
        }

        if (materialScore > 0) {
            const materialString = materialArray[materialScore - 1];
            // Generate the tellraw message for this armor piece
            reportBody.push(`§r ${armorType}: ${isEnchanted ? "§aEnchanted§r" : "§4Unenchanted§r"} ${materialString}\n`);
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
