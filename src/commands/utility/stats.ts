import { ChatSendAfterEvent, EntityEquippableComponent, EquipmentSlot, ItemEnchantsComponent, ItemStack, Player, world } from "@minecraft/server";
import { MinecraftEnchantmentTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer, getGamemode } from "../../util.js";
import { ScoreManager } from "../../classes/ScoreManager";

function statsHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.stats) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: stats`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: stats [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Shows logs from the specified user.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}stats ${player.name}`,
        `        §4- §6Show logs for the specified user§f`,
        `    ${prefix}stats help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name stats
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function stats(message: ChatSendAfterEvent, args: string[]) {
    handleStats(message, args).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleStats(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/stats.js:29)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to enable cheat notifications.`);
    }

    // try to find the player requested
    let member: Player;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }

    const reportBody = [
        `\n§f§4[§6Paradox§4]§f Getting all Paradox Logs from: §6${member.name}§f`,
        `§f§4[§6Paradox§4]§f §6${member.name}§f is in Gamemode: §7${getGamemode(member)}§f`,
        `§f§4[§6Paradox§4]§f §6${member.name}§f is currently at X= §7${member.location.x.toFixed(0)}§f Y= §7${member.location.y.toFixed(0)}§f Z= §7${member.location.z.toFixed(0)}§f`,
    ];

    switch (true) {
        case member.hasTag("paradoxFreeze"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is frozen by ${member.hasTag("freezeAura") ? "AntiKillAura" : member.hasTag("freezeNukerA") ? "AntiNukerA" : member.hasTag("freezeScaffoldA") ? "AntiScaffoldA" : "Staff"}`);
            break;
        case member.hasTag("flying"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is flying`);
            break;
        case member.hasTag("vanish"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is vanished`);
            break;
    }

    let violationsFound = 0;
    let vlCount = 0;
    let divider = false;
    ScoreManager.allscores.forEach((objective) => {
        vlCount++;
        const score = ScoreManager.getScore(objective, member);
        if (score > 0) {
            violationsFound++;
            if (violationsFound === 1) {
                divider = true;
                reportBody.push(`§f§4[§6Paradox§4]§4 ----------------------------------§f`);
            }
            reportBody.push(`§f§4[§6Paradox§4]§f §f§4[§6${objective.replace("vl", "").toUpperCase()}§4]§f Violations: ${score}`);
        }
        if (vlCount === ScoreManager.allscores.length && divider === true) {
            reportBody.push(`§f§4[§6Paradox§4]§4 ----------------------------------§f`);
        }
    });

    const equipment = member.getComponent("equippable") as EntityEquippableComponent;
    const helmet = equipment.getEquipment(EquipmentSlot.Head);
    const chest = equipment.getEquipment(EquipmentSlot.Chest);
    const legs = equipment.getEquipment(EquipmentSlot.Legs);
    const feet = equipment.getEquipment(EquipmentSlot.Feet);
    const mainhand = equipment.getEquipment(EquipmentSlot.Mainhand);
    const offhand = equipment.getEquipment(EquipmentSlot.Offhand);

    const materialColors: { [key: string]: string } = {
        golden: "§6", // gold
        iron: "§7", // light gray
        diamond: "§b", // aqua
        leather: "§e", // yellow
        chainmail: "§8", // dark gray
        turtle: "§a", // green
        netherite: "§4", // dark red
        elytra: "§5", // purple
        none: "§f", // white
    };

    for (const [verification, armorType] of [
        [helmet, "Helmet"],
        [chest, "Chestplate"],
        [legs, "Leggings"],
        [feet, "Boots"],
        [mainhand, "Mainhand"],
        [offhand, "Offhand"],
    ]) {
        if (!(verification instanceof ItemStack)) {
            continue;
        }
        const enchantedEquipment = verification.getComponent("enchantments") as ItemEnchantsComponent;
        const enchantList = enchantedEquipment.enchantments;
        if (!enchantList) {
            continue;
        }
        let isEnchanted = false;
        for (const enchant in MinecraftEnchantmentTypes) {
            const enchantNumber = enchantList.hasEnchantment(MinecraftEnchantmentTypes[enchant as keyof typeof MinecraftEnchantmentTypes]);
            if (enchantNumber > 0) {
                isEnchanted = true;
            }
        }
        let materialType = verification.typeId.split(":")[1].replace(/_\w+/, "");
        if (armorType === "Mainhand" || armorType === "Offhand") {
            materialType = verification.typeId.split(":")[1];
        }
        const materialColor = materialColors[materialType] || materialColors["none"];
        reportBody.push(`§f§4[§6Paradox§4]§f §7${armorType}§f: ${isEnchanted ? "§aEnchanted§f" : "§4Unenchanted§f"} || ${materialColor}${materialType}`);
    }

    sendMsgToPlayer(player, reportBody);
}
