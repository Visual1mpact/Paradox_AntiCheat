import { ChatSendBeforeEvent, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import * as CryptoESImport from "../../node_modules/crypto-es";

const _default = (CryptoESImport as any).default ?? CryptoESImport;

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
        description: "Toggle server lockdown for maintenance. Lockdown kicks all non-administrator players and prevents them from rejoining.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Toggle Lockdown",
                description: "Enable or disable server lockdown.",
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
    execute: (message?: ChatSendBeforeEvent, _: string[] = [], __?: typeof _default, returnMonitorFunction: boolean = false): void | ((event: PlayerSpawnAfterEvent) => void) => {
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
                world.afterEvents.playerSpawn.unsubscribe(lockdownMonitorFn);
                lockdownMonitorFn = undefined;
            }

            return;
        }

        // Enable lockdown
        for (const target of world.getAllPlayers()) {
            const securityCheck = target.getDynamicProperty("securityClearance") as number;
            if (securityCheck !== 4) {
                target.runCommand(`kick @s ${reason}`);
            }
        }

        world.setDynamicProperty("lockdown_b", true);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Server lockdown has been §aenabled§7!`);

        lockdownMonitorFn = createLockDownMonitor(reason);
        world.afterEvents.playerSpawn.subscribe(lockdownMonitorFn);
    },
};
