import { EntityInventoryComponent, Player } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";

export const punishCommand: Command = {
    name: "punish",
    description: "Removes all items from the player's inventory and ender chest.",
    usage: "!punish <player>",
    examples: [`!punish Player Name`, `!punish "Player Name"`, `!punish help`],
    execute: (message, args, minecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        const playerPerms = message.sender.getDynamicProperty(`__${message.sender.id}`);
        const worldPerms = world.getDynamicProperty(`__${message.sender.id}`);

        // Check if the player has permissions to execute the command
        if (!worldPerms || worldPerms !== playerPerms) {
            message.sender.sendMessage("§o§7You do not have permissions.");
            return;
        }

        // Function to look up a player and retrieve the object
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§o§7Please provide a player name.");
            return;
        }

        // Join args to get the player name
        let playerName = args.join(" ").trim();

        // Remove "@" symbol from playerName if present
        if (playerName.startsWith("@")) {
            playerName = playerName.substring(1);
        }

        // Wipe them out
        system.run(() => {
            const target = getPlayerObject(playerName);
            if (target && target.isValid()) {
                // Get requested player's inventory so we can wipe it out
                const inventoryContainer = target.getComponent("minecraft:inventory") as EntityInventoryComponent;
                const inventory = inventoryContainer.container;

                // Wipe everything in their inventory
                inventory.clearAll();

                // Wipe their ender chest
                // There are 30 slots ranging from 0 to 29
                for (let slot = 0; slot < 30; slot++) {
                    target.runCommand(`replaceitem entity @s slot.enderchest ${slot} air`);
                }

                message.sender.sendMessage(`§o§7Punished "${target.name}"!`);
            } else {
                message.sender.sendMessage(`§o§7Failed to punish "${target ? target.name : playerName}"! Please try again.`);
            }
        });
    },
};
