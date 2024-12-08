import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startFlyCheck, stopFlyCheck } from "../../modules/fly";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the antifly command.
 */
export const flyCheckCommand: Command = {
    name: "antifly",
    description: "Toggles checks for illegal flying.",
    usage: "{prefix}antifly [ help ]",
    examples: [`{prefix}antifly`, `{prefix}antifly help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        // Get fly detection status from the database
        const antiflyEnabled = (paradoxModulesDB.get("flyCheck_b") as boolean) ?? false;

        if (!antiflyEnabled) {
            // Enable the module
            paradoxModulesDB.set("flyCheck_b", true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §aenabled§7.`);

            // Start fly detection
            system.run(() => {
                startFlyCheck();
            });
        } else {
            // Disable the module
            paradoxModulesDB.set("flyCheck_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §4disabled§7.`);

            // Stop fly detection
            system.run(() => {
                stopFlyCheck();
            });
        }
    },
};
