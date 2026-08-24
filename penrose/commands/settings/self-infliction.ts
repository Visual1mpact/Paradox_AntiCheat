import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
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
        description:
            "Monitor and prevent players from inflicting damage upon themselves to gain unfair advantages.\n\n" +
            "§7• Identifies 'damage-boosting' exploits used to manipulate velocity.\n" +
            "§7• Blocks self-harm attempts designed to reset combat timers or knockback.\n" +
            "§7• Ensures consistent and fair physics during PvP engagements.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/attack_pressed.png",
                description: "Toggle the self-attack detection module on or off.",
            },
        ],
    },

    /**
     * Executes the self-attack detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} [_] - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const selfAttackCheckKey = "selfAttackCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const moduleData = (await paradoxModulesDB.get(selfAttackCheckKey)) ?? {
            enabled: false,
        };
        const selfAttackCheckEnabled = moduleData?.enabled ?? false;

        if (!selfAttackCheckEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set(selfAttackCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Self-attack detection has been §aenabled§7.`);
            startSelfAttackCheck();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set(selfAttackCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Self-attack detection has been §4disabled§7.`);
            stopSelfAttackCheck();
        }
    },
};
