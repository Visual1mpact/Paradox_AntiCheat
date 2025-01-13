import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

/**
 * Represents the opsec command.
 */
export const opsecCommand: Command = {
    name: "opsec",
    description: "Change a player's security clearance level.",
    usage: "{prefix}opsec <player> <clearance>",
    examples: [`{prefix}opsec PlayerName 3`, `{prefix}opsec Player Name 3`, `{prefix}opsec "PlayerName" 3`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/permissions_member_star.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "OpSec Command",
        description: "Change a player's security clearance level.\n\n",
        actions: [
            {
                name: "Change Clearance",
                command: undefined,
                description: "Select a player and their new clearance level.",
                requiredFields: ["playerName", "clearanceLevel"],
                generateModalForm: true,
                icon: "textures/ui/invertedmultiselecticon.png",
            },
        ],
        dynamicFields: [
            {
                name: "Select Target Player:",
                arg: undefined,
                type: "dropdown",
                requiredFields: ["playerName"],
            },
            {
                name: "Select New Clearance Level:",
                arg: undefined,
                type: "text",
                requiredFields: ["clearanceLevel"],
                placeholder: "Enter value 1 through 3",
            },
        ],
    },

    /**
     * Executes the opsec command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        const senderClearance = message.sender.getDynamicProperty("securityClearance") as number;

        // Validate command arguments
        if (args.length < 2) {
            message.sender.sendMessage("§cPlease provide a player name and a clearance level.");
            return;
        }

        const targetPlayerName = args.slice(0, -1).join(" ").replace(/[@"]/g, "").trim();
        const newClearance = parseInt(args[args.length - 1]);

        // Check permission for security clearance 4
        if (senderClearance === 4 && newClearance === 4) {
            message.sender.sendMessage("§cThis action is restricted. Use the OP command for clearance level 4.");
            return;
        }

        if (isNaN(newClearance) || newClearance < 1 || newClearance > 3) {
            message.sender.sendMessage("§cInvalid clearance level. Use a number between 1 and 3.");
            return;
        }

        const targetPlayer = world.getAllPlayers().find((player) => player.name === targetPlayerName);

        if (!targetPlayer || !targetPlayer.isValid()) {
            message.sender.sendMessage(`§cPlayer "${targetPlayerName}" not found or is invalid.`);
            return;
        }

        // Update and notify about the security clearance change
        targetPlayer.setDynamicProperty("securityClearance", newClearance);
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance for "${targetPlayer.name}" set to ${newClearance}.`);
        targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance has been updated to level ${newClearance} by "${message.sender.name}".`);
    },
};
