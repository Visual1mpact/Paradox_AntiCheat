import { Command } from "../../classes/CommandHandler";

export const deopCommand: Command = {
    name: "deop",
    description: "Remove Paradox-Op permissions from a player.",
    usage: "!deop <player>",
    examples: [`!deop Player Name`, `!deop "Player Name"`, `!deop help`],
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

        // Function to remove player permissions based on the unique prefix
        function removePlayerPermissions(playerName: string): boolean {
            const player = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
            if (player && player.isValid()) {
                // Unique prefix
                const prefix = `__${player.id}`;
                player.setDynamicProperty(prefix, undefined);
                world.setDynamicProperty(prefix, undefined);
                return true;
            } else {
                return false;
            }
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§o§7Please provide a player name.");
            return;
        }

        // Join args to get the player name
        const playerName = args.join(" ").trim();

        // Remove permissions for the player
        system.run(() => {
            const isValid = removePlayerPermissions(playerName);
            // Inform the sender if permissions have been removed
            if (isValid) {
                message.sender.sendMessage(`§o§7Permissions removed for player: "${playerName}"`);
            } else {
                message.sender.sendMessage(`§o§7Permissions not removed for player "${playerName}". Please try again!`);
            }
        });
    },
};
