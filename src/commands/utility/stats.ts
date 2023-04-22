/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { getPrefix, sendMsgToPlayer, getScore, getGamemode } from "../../util.js";

function statsHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.stats) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: stats`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: stats [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Shows logs from the specified user.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}stats ${player.name}`,
        `    ${prefix}stats help`,
    ]);
}

/**
 * @name stats
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function stats(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/stats.js:29)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return statsHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.stats) {
        return statsHelp(player, prefix);
    }

    if (!player.hasTag("notify")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable cheat notifications.`);
    }

    // try to find the player requested
    let member: Player;
    for (const pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
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
        `\n§r§4[§6Paradox§4]§r Getting all Paradox Logs from: §6${member.name}§r`,
        `§r§4[§6Paradox§4]§r §6${member.name}§r is in Gamemode: ${getGamemode(member)}`,
        `§r§4[§6Paradox§4]§r §6${member.name}§r is currently at X= ${member.location.x.toFixed(0)} Y= ${member.location.y.toFixed(0)} Z= ${member.location.z.toFixed(0)}`,
    ];

    switch (true) {
        case member.hasTag("freeze"):
            reportBody.push(`§r§4[§6Paradox§4]§r §6${member.name}§r is frozen by Staff`);
            break;
        case member.hasTag("flying"):
            reportBody.push(`§r§4[§6Paradox§4]§r §6${member.name}§r is flying`);
            break;
        case member.hasTag("vanish"):
            reportBody.push(`§r§4[§6Paradox§4]§r §6${member.name}§r is vanished`);
            break;
    }

    let violationsFound = 0;
    let vlCount = 0;
    let divider = false;
    scores.forEach((score) => {
        vlCount++;
        try {
            const objective = world.scoreboard.getObjective(score);
            const playerScore = member.scoreboard.getScore(objective);
            if (playerScore > 0) {
                violationsFound++;
                if (violationsFound === 1) {
                    divider = true;
                    reportBody.push(`§r§4[§6Paradox§4]§4 ----------------------------------§r`);
                }
                reportBody.push(`§r§4[§6Paradox§4]§r §r§4[§6${score.replace("vl", "").toUpperCase()}§4]§r Violations: ${playerScore}`);
            }
        } catch {
            // Ignore since this score doesn't exist for this player yet.
        }
        if (vlCount === scores.length && divider === true) {
            reportBody.push(`§r§4[§6Paradox§4]§4 ----------------------------------§r`);
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
            reportBody.push(`§r§4[§6Paradox§4]§r ${armorType}: ${isEnchanted ? "§aEnchanted§r" : "§4Unenchanted§r"} ${materialString}`);
        }
    }

    sendMsgToPlayer(player, reportBody);
}
