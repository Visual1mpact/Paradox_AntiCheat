import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startKillAuraCheck, stopKillAuraCheck } from "../../modules/killaura";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the killaura detection command.
 */
export const killauraCommand: Command = {
    name: "killaura",
    description: "Toggles the killaura detection module.",
    usage: "{prefix}killaura [ help ]",
    examples: [`{prefix}killaura`, `{prefix}killaura help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the killaura detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        // Retrieve the current state of the module from paradoxModulesDB
        const killauraEnabled = paradoxModulesDB.get("killAuraCheck_b") ?? false;

        if (!killauraEnabled) {
            // Enable the module
            paradoxModulesDB.set("killAuraCheck_b", true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §aenabled§7.`);
            system.run(() => {
                startKillAuraCheck();
            });
        } else {
            // Disable the module
            paradoxModulesDB.set("killAuraCheck_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §4disabled§7.`);
            system.run(() => {
                stopKillAuraCheck();
            });
        }
    },
};
