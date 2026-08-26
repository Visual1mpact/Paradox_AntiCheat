import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";

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
        description:
            "Modify a player's security clearance level.\n\n" +
            "§7• §fChange Clearance§7: Select a player and assign them a clearance level (1-3).\n" +
            "§7• §fRestrictions§7: Level 4 clearance cannot be set using this command; use the OP command instead.\n\n" +
            "§7Notes:\n" +
            "§7• Player names are case-sensitive.\n" +
            "§7• Only administrators with security clearance 4 can use this command.\n\n",
        actions: [
            {
                name: "Change Clearance",
                description: "Select a player and their new clearance level.",
                requiredFields: ["playerName", "clearanceLevel"],
                generateModalForm: true,
                icon: "textures/ui/invertedmultiselecticon.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
            {
                name: "\nSelect New Clearance Level:",
                type: "text",
                requiredFields: ["clearanceLevel"],
                placeholder: "Enter value 1 through 3",
            },
        ],
    },

    /**
     * Executes the opsec command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const senderClearance = message.sender.getDynamicProperty("securityClearance") as number;

        // Validate command arguments
        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name and a clearance level.");
            return;
        }

        const targetPlayerName = args.slice(0, -1).join(" ").trim().replace(/["@]/g, "");
        const newClearance = parseInt(args[args.length - 1]!, 10);

        // Check permission for security clearance 4
        if (senderClearance === 4 && newClearance === 4) {
            message.sender.sendMessage("§o§c[Paradox] This action is restricted. Use the OP command for clearance level 4.");
            return;
        }

        if (isNaN(newClearance) || newClearance < 1 || newClearance > 3) {
            message.sender.sendMessage("§o§c[Paradox] Invalid clearance level. Use a number between 1 and 3.");
            return;
        }

        const targetPlayer = PlayerCache.getPlayerByName(targetPlayerName);

        if (!targetPlayer || !targetPlayer.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${targetPlayerName}§c" not found or is invalid.`);
            return;
        }

        // Update and notify about the security clearance change
        targetPlayer.setDynamicProperty("securityClearance", newClearance);
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance for "${targetPlayer.name}§7" set to ${newClearance}§7.`);
        targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance has been updated to level ${newClearance}§7 by "${message.sender.name}§7".`);
    },
};
