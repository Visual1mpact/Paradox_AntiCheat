import { Command } from "../../classes/core/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { getGlobalBans, saveGlobalBans, getLocalBans, saveLocalBans } from "../../data/ban-manager";

/** Defines the unban command for removing local or global player bans */
export const unbanCommand: Command = {
    name: "unban",
    description: "Unban a previously banned player.",
    usage: "{prefix}unban <player> [ --global | -g ]",
    examples: [`{prefix}unban Steve`, `{prefix}unban Steve --global`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/hammer_l_disabled.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Unban Player",
        description:
            "Unban a player from the local or global ban list.\n\n" +
            "§7• Enter the name of the player to remove from the ban list.\n" +
            "§7• Toggle 'Global Unban' to remove the player from all worlds.\n" +
            "§7• Only administrators with sufficient clearance can perform this action.\n\n",
        commandOrder: "arg-command",
        actions: [
            {
                name: "Unban a Player",
                description: "Select a player to unban and specify whether the unban is global.",
                requiredFields: ["unbanTarget"],
                generateModalForm: true,
                icon: "textures/ui/hammer_r_disabled.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nEnter Player to Unban:",
                type: "text",
                placeholder: "Redemption awaits...",
                requiredFields: ["unbanTarget"],
            },
            {
                name: "\nGlobal Unban (optional):",
                arg: "--global",
                type: "toggle",
                requiredFields: ["unbanTarget"],
            },
        ],
    },

    /**
     * Executes the unban command.
     * @param {ChatSendBeforeEvent | undefined} message - Contextual execution event.
     * @param {string[]} args - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const isGlobal = args.includes("--global") || args.includes("-g");
        const filteredArgs = args.filter((arg) => !["--global", "-g"].includes(arg));
        const playerName = filteredArgs.join(" ").trim().replace(/["@]/g, "");

        if (!playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a valid player name.");
            return;
        }

        if (isGlobal) {
            const currentBans = getGlobalBans();
            const lowerTarget = playerName.toLowerCase();
            const updatedBans = currentBans.filter((name) => name.toLowerCase() !== lowerTarget);

            if (currentBans.length === updatedBans.length) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the global ban list.`);
                return;
            }

            saveGlobalBans(updatedBans);
        } else {
            const localBans = await getLocalBans();

            if (!(playerName in localBans)) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the local ban list.`);
                return;
            }

            delete localBans[playerName];
            await saveLocalBans(localBans);
        }

        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been unbanned from the ${isGlobal ? "global" : "local"} ban list.`);
    },
};
