import { ChatSendBeforeEvent, PlayerSpawnAfterEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import _default from "../../node_modules/crypto-es/lib/index";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "Server Lockdown Command",
        description: "Toggle server lockdown for maintenance. Lockdown kicks all non-administrator players and prevents them from rejoining.\n\n",
        actions: [
            {
                name: "Toggle Lockdown",
                command: undefined,
                description: "Enable or disable server lockdown.",
            },
        ],
    },

    /**
     * Executes the lockdown command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     * @param {boolean} [returnMonitorFunction=false] - If true, returns the lockDownMonitor function.
     * @returns {void | (function(PlayerSpawnAfterEvent): void)} - The lockDownMonitor function if returnMonitorFunction is true, otherwise void.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment, __: typeof _default, returnMonitorFunction: boolean = false): void | ((object: PlayerSpawnAfterEvent) => void) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Get Dynamic Property Boolean to check if the server is already in lockdown
        const lockdownBoolean = world.getDynamicProperty("lockdown_b");

        if (returnMonitorFunction) {
            return lockDownMonitor;
        }

        const player = message.sender;

        // If already locked down, unlock the server and return
        if (lockdownBoolean) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been disabled!`);
            system.run(() => {
                world.setDynamicProperty("lockdown_b", false); // Set lockdown_b to false to unlock the server
                world.afterEvents.playerSpawn.unsubscribe(lockDownMonitor); // Unsubscribe from playerSpawnSubscription
            });
            return;
        }

        // Default reason for locking it down
        const reason = "Under Maintenance! Sorry for the inconvenience.";

        // Run the lockdown operation asynchronously
        system.run(() => {
            // Lock down the server
            const players = world.getAllPlayers();
            for (const target of players) {
                const securityCheck = target.getDynamicProperty("securityClearance") as number;
                if (securityCheck !== 4) {
                    // Kick players from server
                    world.getDimension(target.dimension.id).runCommandAsync(`kick ${target.name} §o§7\n\n${reason}`);
                }
            }
            // Set lockdown_b to true to indicate server lockdown
            world.setDynamicProperty("lockdown_b", true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been enabled!`);

            // Subscribe to playerSpawnSubscription
            world.afterEvents.playerSpawn.subscribe(lockDownMonitor);
        });

        /**
         * Function to monitor player spawns during lockdown.
         * @param {PlayerSpawnAfterEvent} object - The player spawn event object.
         */
        function lockDownMonitor(object: PlayerSpawnAfterEvent) {
            // Default reason for locking it down
            const reason = "Under Maintenance! Sorry for the inconvenience.";
            if (object.initialSpawn === true) {
                const securityCheck = object.player.getDynamicProperty("securityClearance") as number;
                if (securityCheck !== 4) {
                    // Kick players from server
                    world.getDimension(object.player.dimension.id).runCommandAsync(`kick ${object.player.name} §o§7\n\n${reason}`);
                    return;
                }
            }
        }
    },
};
