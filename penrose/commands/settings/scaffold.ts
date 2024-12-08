import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startScaffoldCheck, stopScaffoldCheck } from "../../modules/scaffold";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the scaffold detection command.
 */
export const scaffoldCommand: Command = {
    name: "scaffold",
    description: "Toggles the scaffold detection module.",
    usage: "{prefix}scaffold [ help ]",
    examples: [`{prefix}scaffold`, `{prefix}scaffold help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the scaffold detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        const scaffoldCheckKey = "scaffoldCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const scaffoldCheckEnabled = paradoxModulesDB.get(scaffoldCheckKey) ?? false;

        if (!scaffoldCheckEnabled) {
            // Enable the scaffold detection module
            paradoxModulesDB.set(scaffoldCheckKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §aenabled§7.`);
            system.run(() => {
                startScaffoldCheck();
            });
        } else {
            // Disable the scaffold detection module
            paradoxModulesDB.set(scaffoldCheckKey, false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §4disabled§7.`);
            system.run(() => {
                stopScaffoldCheck();
            });
        }
    },
};
