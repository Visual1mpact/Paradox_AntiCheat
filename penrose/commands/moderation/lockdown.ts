import { ChatSendBeforeEvent, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import _default from "../../node_modules/crypto-es/lib/index";

/**
 * Persistent Lockdown Monitor Reference
 */
let lockDownMonitor: (event: PlayerSpawnAfterEvent) => void;

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
        description: "Toggle server lockdown for maintenance. Lockdown kicks all non-administrator players and prevents them from rejoining.\n\n",
        actions: [
            {
                name: "Toggle Lockdown",
                command: undefined,
                description: "Enable or disable server lockdown.",
                icon: "textures/ui/icon_lock.png",
            },
        ],
    },

    /**
     * Executes the lockdown command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {boolean} [returnMonitorFunction=false] - If true, returns the lockDownMonitor function.
     * @returns {void | (function(PlayerSpawnAfterEvent): void)} - The lockDownMonitor function if returnMonitorFunction is true, otherwise void.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], __: typeof _default, returnMonitorFunction: boolean = false): void | ((object: PlayerSpawnAfterEvent) => void) => {
        // Get Dynamic Property Boolean to check if the server is already in lockdown
        const lockdownBoolean = world.getDynamicProperty("lockdown_b");

        if (returnMonitorFunction) {
            return lockDownMonitor;
        }

        const player = message.sender;

        // If already locked down, unlock the server and return
        if (lockdownBoolean) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §4disabled§7!`);

            world.setDynamicProperty("lockdown_b", false); // Set lockdown_b to false to unlock the server

            // Ensure we properly unsubscribe using the stored function reference
            if (lockDownMonitor) {
                world.afterEvents.playerSpawn.unsubscribe(lockDownMonitor);
            }

            return;
        }

        // Default reason for locking it down
        const reason = "Under Maintenance! Sorry for the inconvenience.";

        // Run the lockdown operation asynchronously

        // Lock down the server
        const players = world.getAllPlayers();
        for (const target of players) {
            const securityCheck = target.getDynamicProperty("securityClearance") as number;
            if (securityCheck !== 4) {
                // Kick players from server
                target.runCommand(`kick @s §o§7\n\n${reason}`);
            }
        }
        // Set lockdown_b to true to indicate server lockdown
        world.setDynamicProperty("lockdown_b", true);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §aenabled§7!`);

        // Store and subscribe the persistent function reference
        lockDownMonitor = function (object: PlayerSpawnAfterEvent) {
            if (object.initialSpawn === true) {
                const securityCheck = object.player.getDynamicProperty("securityClearance") as number;
                if (securityCheck !== 4) {
                    // Kick players from server
                    object.player.runCommand(`kick @s §o§7\n\n${reason}`);
                }
            }
        };

        world.afterEvents.playerSpawn.subscribe(lockDownMonitor);
    },
};
