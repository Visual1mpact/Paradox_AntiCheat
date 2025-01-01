import { EntityEquippableComponent, EntityInventoryComponent, Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

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

    /**
     * Executes the punish command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const equipmentSlot = minecraftEnvironment.getEquipmentSlot();

        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§cPlease provide a player name.");
            return;
        }

        // Extract player name and flags
        let playerName = "";
        let wipeInventory = false;
        let wipeEquipment = false;
        let wipeEnderChest = false;

        // Define valid flags
        const validFlags = new Set(["--inventory", "-i", "--equipment", "-e", "--enderchest", "-ec"]);

        let i = 0;
        while (i < args.length) {
            const arg = args[i].trim().replace(/["@]/g, "");
            if (validFlags.has(arg.toLowerCase())) {
                switch (arg.toLowerCase()) {
                    case "--inventory":
                    case "-i": {
                        wipeInventory = true;
                        break;
                    }
                    case "--equipment":
                    case "-e": {
                        wipeEquipment = true;
                        break;
                    }
                    case "--enderchest":
                    case "-ec": {
                        wipeEnderChest = true;
                        break;
                    }
                    default: {
                        message.sender.sendMessage(`§cUnknown flag: ${arg}`);
                        return;
                    }
                }
            } else {
                // If it's not a flag, treat it as part of the player's name
                playerName += `${arg} `;
            }
            i++;
        }
        playerName = playerName.trim();

        // If no specific wipe flag is provided, wipe everything
        if (!wipeInventory && !wipeEquipment && !wipeEnderChest) {
            wipeInventory = wipeEquipment = wipeEnderChest = true;
        }

        // Wipe them out
        system.run(() => {
            const target: Player = getPlayerObject(playerName);
            if (target && target.isValid()) {
                // Wipe out items in each equipment slot from requested player's equipment container
                if (wipeEquipment) {
                    for (const slot of Object.values(equipmentSlot)) {
                        const equippableContainer: EntityEquippableComponent = target.getComponent("minecraft:equippable") as EntityEquippableComponent;
                        equippableContainer.setEquipment(slot); // Set the slot to wipe out
                    }
                }

                // Get requested player's inventory so we can wipe it out
                if (wipeInventory) {
                    const inventoryContainer: EntityInventoryComponent = target.getComponent("minecraft:inventory") as EntityInventoryComponent;
                    const inventory = inventoryContainer.container;
                    inventory.clearAll();
                }

                // Wipe their ender chest
                if (wipeEnderChest) {
                    // There are 30 slots ranging from 0 to 29
                    for (let slot = 0; slot < 30; slot++) {
                        target.runCommand(`replaceitem entity @s slot.enderchest ${slot} air`);
                    }
                }

                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Punished "${target.name}"!`);
            } else {
                message.sender.sendMessage(`§cFailed to punish "${target ? target.name : playerName}"! Please try again.`);
            }
        });
    },
};
