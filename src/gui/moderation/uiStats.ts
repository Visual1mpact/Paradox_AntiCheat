import { EntityEquipmentInventoryComponent, EquipmentSlot, ItemEnchantsComponent, ItemStack, Player, world } from "@minecraft/server";
import { MinecraftEnchantmentTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { ActionFormData, ModalFormResponse } from "@minecraft/server-ui";
import { allscores, getGamemode, getScore } from "../../util";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiSTATS(statsResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = statsResult.formValues;

    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f The player is not online.`);
    }

    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }

    const allObjectives = allscores;

    const reportBody = [
        `§6All Stats for ${member.name}§f\n\n`,
        `§fCurrent Gamemode:§6 ${getGamemode(member)}\n`,
        `§fCurrently at: §4X= ${member.location.x.toFixed(0)} §2Y= ${member.location.y.toFixed(0)} §3Z= ${member.location.z.toFixed(0)}\n`,
        `§f§4--------------------------------§f\n`,
        `§6${member.name}'s Current violations §f\n`,
    ];

    switch (true) {
        case member.hasTag("paradoxFreeze"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is frozen by ${member.hasTag("freezeAura") ? "AntiKillAura" : member.hasTag("freezeNukerA") ? "AntiNukerA" : "Staff"}`);
            break;
        case member.hasTag("flying"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is flying`);
            break;
        case member.hasTag("vanish"):
            reportBody.push(`§f§4[§6Paradox§4]§f §6${member.name}§f is vanished`);
            break;
    }

    allObjectives.forEach((objective) => {
        const score = getScore(objective, member);
        if (score > 0) {
            reportBody.push(`§f§4[§6${objective.replace("vl", "").toUpperCase()}§4]§f number of Violations: ${score}\n`);
        }
    });
    reportBody.push(`§f§4--------------------------------§f\n`);

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
        reportBody.push(`§f${armorType}: ${isEnchanted ? "§aEnchanted§f" : "§4Unenchanted§f"} || ${materialColor}${materialType}\n`);
    }

    const ResultsUI = new ActionFormData();
    ResultsUI.title("§4Paradox - Report for §4" + member.name);
    const tempstring = reportBody.toString().replaceAll(",", "");
    ResultsUI.body(tempstring);
    ResultsUI.button("Close");
    ResultsUI.show(player).then(() => {
        //Simply re show the main UI
        return paradoxui(player);
    });
    return player;
}
