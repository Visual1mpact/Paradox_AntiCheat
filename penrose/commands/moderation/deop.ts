import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { removePlayerFromSecurityClearanceList } from "../../utility/level-4-security-tracker";
import { PlayerCache } from "../../classes/player-cache";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Represents the deop command.
 */
export const deopCommand: Command = {
    name: "deop",
    description: "Remove Paradox-Op permissions from a player.",
    usage: "{prefix}deop <player>",
    examples: [`{prefix}deop Player Name`, `{prefix}deop "Player Name"`, `{prefix}deop help`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/deop.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Deop Player",
        description: "Remove Paradox-Op permissions from a player.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Select Online Player",
                description: "Remove permissions from an online player.",
                requiredFields: ["onlineName"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
            {
                name: "Input Player Name",
                description: "Manually input the name of a player to remove permissions.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/chat_keyboard.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Online Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["onlineName"],
            },
            {
                name: "\nPlayer Name:",
                type: "text",
                placeholder: "Enter the player's name",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the deop command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>} A promise that resolves once the command execution is complete.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return Promise.resolve();
        return new Promise<void>((resolve) => {
            /**
             * Removes Paradox-Op permissions associated with a player.
             * @param {string} playerName - The name of the player whose permissions should be removed.
             * @returns {boolean} True if permissions were successfully removed, false otherwise.
             */
            function removePlayerPermissions(playerName: string): boolean {
                // Retrieve and parse security clearance list data
                const moduleKey = "paradoxOPSEC";
                const securityClearanceListKey = "securityClearanceList";
                const securityListObject = world.getDynamicProperty(moduleKey) as string;
                const securityClearanceListData: SecurityClearanceData = JSON.parse(securityListObject);
                const securityClearanceList = securityClearanceListData[securityClearanceListKey];

                // First, check if the player is online using the cached PlayerCache
                const player = PlayerCache.getPlayerByName(playerName);

                if (player && player.isValid) {
                    // Remove player from the security clearance list
                    const updatedList = securityClearanceList.filter((playerObject: PlayerInfo) => playerObject.id !== player.id);
                    securityClearanceListData.securityClearanceList = updatedList;

                    // Player is online, remove their permissions if applicable
                    if (securityClearanceListData.host?.id === player.id && message?.sender.id !== player.id) {
                        message?.sender.sendMessage("§o§c[Paradox] You cannot remove the host from the security clearance list.");
                        return false;
                    }

                    // Save the updated list back to the world
                    world.setDynamicProperty(moduleKey, JSON.stringify(securityClearanceListData));

                    // Set security clearance to default level 1
                    player.setDynamicProperty("securityClearance", 1);

                    // Remove player from the level 4 tracker
                    removePlayerFromSecurityClearanceList(player);

                    return true;
                } else {
                    // Player is offline, attempt to remove by name
                    const playerIndex = securityClearanceList.findIndex((playerObject: PlayerInfo) => playerObject.name === playerName);

                    if (playerIndex !== -1) {
                        const removedPlayer = securityClearanceList.splice(playerIndex, 1)[0];

                        // Check if the removed player was the host
                        if (securityClearanceListData.host?.id === removedPlayer.id) {
                            message?.sender.sendMessage("§o§c[Paradox] You cannot remove the host from the security clearance list.");
                            return false;
                        }

                        // Save the updated list back to the world
                        securityClearanceListData.securityClearanceList = securityClearanceList;
                        world.setDynamicProperty(moduleKey, JSON.stringify(securityClearanceListData));

                        return true;
                    } else {
                        // Player not found in list
                        message?.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" not found in the security clearance list.`);
                        return false;
                    }
                }
            }

            // Check if player argument is provided
            if (!args.length) {
                message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
                resolve();
                return;
            }

            // Join args to get the player name
            const playerName = args.join(" ").trim().replace(/["@]/g, "");

            // Remove permissions for the player
            const isValid = removePlayerPermissions(playerName);
            // Inform the sender if permissions have been removed
            if (isValid) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Permissions removed for player: "${playerName}§7"`);
            } else {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Permissions not removed for player "${playerName}§7". Please try again!`);
            }
            resolve();
        });
    },
};
