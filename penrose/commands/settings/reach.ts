import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startHitReachCheck, stopHitReachCheck } from "../../modules/reach";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the hit reach detection command.
 */
export const hitReachCheckCommand: Command = {
    name: "reach",
    description: "Toggles the module that checks if players are hit from a fair distance.",
    usage: "{prefix}reach [ help ]",
    examples: [`{prefix}reach`, `{prefix}reach help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/permissions_visitor_hand.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Hit Reach Detection Settings",
        description: "Enable or disable the reach detection module to prevent players from hitting others from an unfair distance.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/permissions_visitor_hand.png",
            },
        ],
    },

    /**
     * Executes the hit reach detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;

        const hitReachCheckKey = "hitReachCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const hitReachCheckEnabled = paradoxModulesDB.get(hitReachCheckKey) ?? false;

        if (!hitReachCheckEnabled) {
            // Enable the module
            paradoxModulesDB.set(hitReachCheckKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §aenabled§7.`);
            system.run(() => {
                startHitReachCheck();
            });
        } else {
            // Disable the module
            paradoxModulesDB.set(hitReachCheckKey, false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §4disabled§7.`);
            system.run(() => {
                stopHitReachCheck();
            });
        }
    },
};
