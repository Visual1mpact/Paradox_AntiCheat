import { ChatSendAfterEvent, EntityEquipmentInventoryComponent, EquipmentSlot, ItemEnchantsComponent, ItemStack, Player, world } from "@minecraft/server";
import { MinecraftEnchantmentTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { allscores, getGamemode, getPrefix, getScore, sendMsgToPlayer } from "../../util.js";

function fullReportHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.fullreport) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: fullreport`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: fullreport [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: View logs from all player's currently online.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}fullreport`,
        `    ${prefix}fullreport help`,
    ]);
}

/**
 * @name fullreport
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function fullreport(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fullreport.js:28)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.fullreport) {
        return fullReportHelp(player, prefix);
    }

    if (!player.hasTag("notify")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable cheat notifications.`);
    }

    const players = world.getPlayers();
    for (const member of players) {
        const reportBody = [
            `\n§r§4[§6Paradox§4]§r Getting all Paradox Logs from: §6${member.name}§r`,
            `§r§4[§6Paradox§4]§r §6${member.name}§r is in Gamemode: ${getGamemode(member)}`,
            `§r§4[§6Paradox§4]§r §6${member.name}§r is currently at X= ${member.location.x.toFixed(0)} Y= ${member.location.y.toFixed(0)} Z= ${member.location.z.toFixed(0)}`,
        ];

        switch (true) {
            case member.hasTag("paradoxFreeze"):
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
        allscores.forEach((objective) => {
            vlCount++;
            const score = getScore(objective, member);
            if (score > 0) {
                violationsFound++;
                if (violationsFound === 1) {
                    divider = true;
                    reportBody.push(`§r§4[§6Paradox§4]§4 ----------------------------------§r`);
                }
                reportBody.push(`§r§4[§6Paradox§4]§r §r§4[§6${objective.replace("vl", "").toUpperCase()}§4]§r Violations: ${score}`);
            }
            if (vlCount === allscores.length && divider === true) {
                reportBody.push(`§r§4[§6Paradox§4]§4 ----------------------------------§r`);
            }
        });

        const equipment = member.getComponent("equipment_inventory") as EntityEquipmentInventoryComponent;
        const helmet = equipment.getEquipment("head" as EquipmentSlot);
        const chest = equipment.getEquipment("chest" as EquipmentSlot);
        const legs = equipment.getEquipment("legs" as EquipmentSlot);
        const feet = equipment.getEquipment("feet" as EquipmentSlot);
        const mainhand = equipment.getEquipment("mainhand" as EquipmentSlot);
        const offhand = equipment.getEquipment("offhand" as EquipmentSlot);

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
            reportBody.push(`§r§4[§6Paradox§4]§r ${armorType}: ${isEnchanted ? "§aEnchanted§r" : "§4Unenchanted§r"} || ${materialColor}${materialType}`);
        }

        sendMsgToPlayer(player, reportBody);
    }
}
