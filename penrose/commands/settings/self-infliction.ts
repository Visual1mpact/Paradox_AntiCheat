import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startSelfAttackCheck, stopSelfAttackCheck } from "../../modules/self-infliction";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the self-attack detection command.
 */
export const selfAttackCheckCommand: Command = {
    name: "selfattack",
    description: "Toggles the module that checks if players attack themselves.",
    usage: "{prefix}selfattack [ help ]",
    examples: [`{prefix}selfattack`, `{prefix}selfattack help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/attack.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Self-Attack Detection Settings",
        description: "Enable or disable the self-attack detection module to prevent players from attacking themselves.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/attack_pressed.png",
            },
        ],
    },

    /**
     * Executes the self-attack detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]): Promise<void> => {
        const player = message.sender;

        const selfAttackCheckKey = "selfAttackCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const selfAttackCheckEnabled = paradoxModulesDB.get(selfAttackCheckKey) ?? false;

        if (!selfAttackCheckEnabled) {
            // Enable the module
            await paradoxModulesDB.set(selfAttackCheckKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Self-attack detection has been §aenabled§7.`);
            startSelfAttackCheck();
        } else {
            // Disable the module
            await paradoxModulesDB.set(selfAttackCheckKey, false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Self-attack detection has been §4disabled§7.`);
            stopSelfAttackCheck();
        }
    },
};
