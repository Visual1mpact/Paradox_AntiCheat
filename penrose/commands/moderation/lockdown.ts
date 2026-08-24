import { ChatSendBeforeEvent, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { EventCoordinator } from "../../classes/core/event-coordinator";

let lockdownMonitorFn: ((event: PlayerSpawnAfterEvent) => void) | undefined;

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
     * @param {string[]} _ - The command arguments.
     * @param {boolean} [returnMonitorFunction=false] - If true, returns the lockDownMonitor function.
     * @returns {void | (function(PlayerSpawnAfterEvent): void)} - The lockDownMonitor function if returnMonitorFunction is true, otherwise void.
     */
    execute: (message?: ChatSendBeforeEvent, _: string[] = [], __?: any, returnMonitorFunction: boolean = false): void | ((event: PlayerSpawnAfterEvent) => void) => {
        if (!message) return;
        const reason = "Under Maintenance! Sorry for the inconvenience.";

        function createLockDownMonitor(reason: string): (event: PlayerSpawnAfterEvent) => void {
            return function (event: PlayerSpawnAfterEvent) {
                if (event.initialSpawn === true) {
                    const securityCheck = event.player.getDynamicProperty("securityClearance") as number;
                    if (securityCheck !== 4) {
                        event.player.runCommand(`kick @s ${reason}`);
                    }
                }
            };
        }

        if (returnMonitorFunction) {
            return lockdownMonitorFn ?? createLockDownMonitor(reason);
        }

        const lockdownBoolean = world.getDynamicProperty("lockdown_b");
        const player = message.sender;

        if (lockdownBoolean) {
            world.setDynamicProperty("lockdown_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §4disabled§7!`);

            if (lockdownMonitorFn) {
                EventCoordinator.unsubscribeAfter("playerSpawn", lockdownMonitorFn);
                lockdownMonitorFn = undefined;
            }

            return;
        }

        // Enable lockdown
        for (const target of PlayerCache.getPlayers()) {
            const securityCheck = target.getDynamicProperty("securityClearance") as number;
            if (securityCheck !== 4) {
                target.runCommand(`kick @s ${reason}`);
            }
        }

        world.setDynamicProperty("lockdown_b", true);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §aenabled§7!`);

        lockdownMonitorFn = createLockDownMonitor(reason);
        EventCoordinator.subscribeAfter("playerSpawn", lockdownMonitorFn);
    },
};
