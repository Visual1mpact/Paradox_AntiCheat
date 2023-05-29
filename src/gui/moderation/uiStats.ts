import { EntityEquipmentInventoryComponent, EquipmentSlot, ItemEnchantsComponent, ItemStack, Player, world } from "@minecraft/server";
import { MinecraftEnchantmentTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { allscores, getGamemode } from "../../util";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiSTATS(statsResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = statsResult.formValues;

    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
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

    const scores = allscores;

    const reportBody = [
        `§6All Stats for ${member.name}§r\n\n`,
        `§rCurrent Gamemode:§6 ${getGamemode(member)}\n`,
        `§rCurrently at: §4X= ${member.location.x.toFixed(0)} §2Y= ${member.location.y.toFixed(0)} §3Z= ${member.location.z.toFixed(0)}\n`,
        `§r§4--------------------------------§r\n`,
        `§6${member.name}'s Current violations §r\n`,
    ];

    scores.forEach((score) => {
        try {
            const objective = world.scoreboard.getObjective(score);
            const playerScore = member.scoreboardIdentity.getScore(objective);
            if (playerScore > 0) {
                reportBody.push(`§r§4[§6${score.replace("vl", "").toUpperCase()}§4]§r number of Violations: ${playerScore}\n`);
            }
        } catch {
            // Ignore since this score doesn't exist for this player yet.
        }
    });
    reportBody.push(`§r§4--------------------------------§r\n`);

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
            const enchantNumber = enchantList.hasEnchantment(enchant);
            if (enchantNumber > 0) {
                isEnchanted = true;
            }
        }
        let materialType = verification.typeId.split(":")[1].replace(/_\w+/, "");
        if (armorType === "Mainhand" || armorType === "Offhand") {
            materialType = verification.typeId.split(":")[1];
        }
        const materialColor = materialColors[materialType] || materialColors["none"];
        reportBody.push(`§r${armorType}: ${isEnchanted ? "§aEnchanted§r" : "§4Unenchanted§r"} || ${materialColor}${materialType}\n`);
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
