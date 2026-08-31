import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startLockdown, stopLockdown } from "../../modules/lockdown-modules";

/**
 * Represents the lockdown command.
 */
export const lockdownCommand: Command = {
    name: "lockdown",
    description: "Initiates server lockdown for maintenance.",
    usage: "{prefix}lockdown [ optional ]",
    examples: [`{prefix}lockdown`, `{prefix}lockdown help`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/lock_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Server Lockdown Command",
        description:
            "Securely restrict server access during maintenance or emergency incidents.\n\n" +
            "§7• Immediately disconnect all players below security clearance level 4.\n" +
            "§7• Block all incoming join attempts from non-administrative accounts.\n" +
            "§7• Create a controlled environment for system updates or forensics.\n\n" +
            "§7Lockdown Rules:\n" +
            "§7• System host and Level 4 staff are entirely exempt from restrictions.\n" +
            "§7• Status persists until manually deactivated by an authorized admin.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Toggle Lockdown",
                description: "Toggle the global lockdown state to manage server accessibility.\n\n",
                icon: "textures/ui/icon_lock.png",
            },
        ],
    },

    /**
     * Executes the lockdown command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;
        const isLockdownActive = (world.getDynamicProperty("lockdown_b") as boolean) ?? false;

        if (isLockdownActive) {
            stopLockdown();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §4disabled§7!`);
        } else {
            startLockdown();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §aenabled§7!`);
        }
    },
};
