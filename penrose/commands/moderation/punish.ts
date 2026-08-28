import { EntityEquippableComponent, EntityInventoryComponent, Player, ChatSendBeforeEvent, EquipmentSlot, EntityEnderInventoryComponent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";

const VALID_FLAGS = new Set(["--inventory", "-i", "--equipment", "-e", "--enderchest", "-ec"]);

interface PunishFlags {
    playerName: string;
    wipeInventory: boolean;
    wipeEquipment: boolean;
    wipeEnderChest: boolean;
}

/**
 * Clears all items equipped on a target player across all equipment slots.
 *
 * @param {Player} target - The player entity whose equipment should be cleared.
 */
function clearPlayerEquipment(target: Player): void {
    const equippableContainer = target.getComponent("minecraft:equippable") as EntityEquippableComponent | undefined;
    if (!equippableContainer) return;

    for (const slot of Object.values(EquipmentSlot)) {
        equippableContainer.setEquipment(slot);
    }
}

/**
 * Clears all items inside a target player's inventory container.
 *
 * @param {Player} target - The player entity whose inventory should be cleared.
 */
function clearPlayerInventory(target: Player): void {
    const inventoryComponent = target.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
    inventoryComponent?.container?.clearAll();
}

/**
 * Clears all items inside a target player's ender chest container.
 *
 * @param {Player} target - The player entity whose ender chest should be cleared.
 */
function clearPlayerEnderChest(target: Player): void {
    const enderInventoryComponent = target.getComponent("minecraft:ender_inventory") as EntityEnderInventoryComponent | undefined;
    enderInventoryComponent?.container?.clearAll();
}

/**
 * Executes requested wiping operations on target player containers based on provided flag configurations.
 *
 * @param {Player} target - Target player entity.
 * @param {PunishFlags} flags - Flag options indicating which containers to clear.
 */
function executePunishment(target: Player, flags: PunishFlags): void {
    if (flags.wipeEquipment) {
        clearPlayerEquipment(target);
    }
    if (flags.wipeInventory) {
        clearPlayerInventory(target);
    }
    if (flags.wipeEnderChest) {
        clearPlayerEnderChest(target);
    }
}

/**
 * Parses command string arguments into structured player name and target wipe flags.
 *
 * @param {string[]} args - Raw argument list provided to the command handler.
 * @returns {PunishFlags} Structured payload containing target name and boolean flags.
 */
function parsePunishArguments(args: string[]): PunishFlags {
    const flags: PunishFlags = {
        playerName: "",
        wipeInventory: false,
        wipeEquipment: false,
        wipeEnderChest: false,
    };

    const nameParts: string[] = [];

    for (const arg of args) {
        const cleanArg = (arg ?? "").replace(/["@]/g, "");
        const lowerArg = cleanArg.toLowerCase();

        if (VALID_FLAGS.has(lowerArg)) {
            if (lowerArg === "--inventory" || lowerArg === "-i") flags.wipeInventory = true;
            if (lowerArg === "--equipment" || lowerArg === "-e") flags.wipeEquipment = true;
            if (lowerArg === "--enderchest" || lowerArg === "-ec") flags.wipeEnderChest = true;
        } else {
            nameParts.push(cleanArg);
        }
    }

    flags.playerName = nameParts.join(" ").trim();

    if (!flags.wipeInventory && !flags.wipeEquipment && !flags.wipeEnderChest) {
        flags.wipeInventory = true;
        flags.wipeEquipment = true;
        flags.wipeEnderChest = true;
    }

    return flags;
}

/**
 * Represents the punish command.
 */
export const punishCommand: Command = {
    name: "punish",
    description: "Removes items from the player's inventory, equipment, and/or ender chest.",
    usage: "{prefix}punish <player> [ --inventory | -i ] [ --equipment | -e ] [ --enderchest | -ec ]",
    examples: [
        `{prefix}punish Player Name`,
        `{prefix}punish "Player Name" --inventory`,
        `{prefix}punish Player Name -i`,
        `{prefix}punish Player Name --equipment`,
        `{prefix}punish Player Name -e`,
        `{prefix}punish Player Name --enderchest`,
        `{prefix}punish Player Name -ec`,
        `{prefix}punish "Player Name" --inventory --equipment --enderchest`,
        `{prefix}punish "Player Name" -i -e -ec`,
        `{prefix}punish help`,
    ],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/warning_alex.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Punish Command",
        description:
            "Remove items from a player's inventory, equipment, and/or ender chest.\n\n" +
            "§7• §fInventory§7: Clears all items from the player's inventory.\n" +
            "§7• §fEquipment§7: Removes all equipped items (armor, held items).\n" +
            "§7• §fEnder Chest§7: Clears all items in the player's ender chest.\n\n" +
            "§7Notes:\n" +
            "§7• If no option is selected, all containers will be cleared.\n" +
            "§7• Only administrators with security clearance 4 can use this command.\n\n",
        commandOrder: "arg-command",
        actions: [
            {
                name: "Select Punishments",
                description: "Choose the punishment to apply (Inventory, Equipment, Ender Chest).",
                requiredFields: ["punishmentType"],
                generateModalForm: true,
                icon: "textures/ui/warning_sad_steve.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Player Name:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["punishmentType"],
            },
            {
                name: "\nPunish Inventory:",
                arg: "--inventory",
                type: "toggle",
                requiredFields: ["punishmentType"],
            },
            {
                name: "\nPunish Equipment:",
                arg: "--equipment",
                type: "toggle",
                requiredFields: ["punishmentType"],
            },
            {
                name: "\nPunish Ender Chest:",
                arg: "--enderchest",
                type: "toggle",
                requiredFields: ["punishmentType"],
            },
        ],
    },

    /**
     * Executes the punish command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The message object context.
     * @param {string[]} args - The command argument list.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        if (!args.length) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        const parsedFlags = parsePunishArguments(args);
        if (!parsedFlags.playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        const target = PlayerCache.getPlayerByName(parsedFlags.playerName);
        if (target && target.isValid) {
            executePunishment(target, parsedFlags);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Punished "${target.name}§7"!`);
        } else {
            const displayTargetName = target ? target.name : parsedFlags.playerName;
            message.sender.sendMessage(`§o§c[Paradox] Failed to punish "${displayTargetName}§c"! Please try again.`);
        }
    },
};
