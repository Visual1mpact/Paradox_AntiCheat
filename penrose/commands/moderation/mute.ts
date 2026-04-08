import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Represents the mute command.
 * This command toggles the mute status of a player using dynamic properties.
 */
export const muteCommand: Command = {
    name: "mute",
    description: "Toggles a player's ability to send chat messages.",
    usage: "{prefix}mute <player>",
    examples: [`{prefix}mute Steve`, `{prefix}mute "Steve Bob"`, `{prefix}mute help`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/mute_off.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Mute Management",
        description: "Toggle a player's ability to chat. Muted players can still run commands but cannot send public chat messages.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Mute / Unmute Player",
                description: "Select a player to toggle their mute status.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the mute command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        let target: Player | undefined;

        if (playerName.length > 0) {
            target = PlayerCache.getPlayerByName(playerName);
        } else {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        if (!target || !target.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}" not found.`);
            return;
        }

        // Prevent muting players with higher clearance (Level 4)
        const targetClearance = target.getDynamicProperty("securityClearance") as number;
        if (targetClearance === 4) {
            message.sender.sendMessage("§o§c[Paradox] You cannot mute a player with Level 4 security clearance.");
            return;
        }
        // Prevent muting self
        if (target.id === message.sender.id) {
            message.sender.sendMessage("§o§c[Paradox] You cannot mute yourself.");
            return;
        }

        const isMuted = target.getDynamicProperty("isMuted") as boolean;
        const newMuteStatus = !isMuted;

        target.setDynamicProperty("isMuted", newMuteStatus);

        if (newMuteStatus) {
            target.sendMessage("§2[§7Paradox§2]§o§7 You have been muted by a moderator.");
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${target.name} has been §4muted§7.`);
        } else {
            target.sendMessage("§2[§7Paradox§2]§o§7 You have been unmuted.");
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${target.name} has been §aunmuted§7.`);
        }
    },
};
