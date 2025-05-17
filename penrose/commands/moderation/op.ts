import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { addPlayerToSecurityClearanceList } from "../../utility/level-4-security-tracker";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Represents the op command.
 */
export const opCommand: Command = {
    name: "op",
    description: "Grant a player Paradox-Op!",
    usage: "{prefix}op <player> | {prefix}op list",
    examples: [`{prefix}op`, `{prefix}op Player Name`, `{prefix}op \"Player Name\"`, `{prefix}op help`, `{prefix}op list`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/items/ender_eye",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Grant OP Command",
        description: "Grant OP to a player or see who has OP.\n\n",
        actions: [
            {
                name: "Grant OP to Player",
                command: undefined,
                description: "Select a player to grant OP status.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/op.png",
            },
            {
                name: "List OP Players",
                command: ["list"],
                description: "See who has OP in Paradox.",
                icon: "textures/ui/icon_sign.png",
            },
        ],
        dynamicFields: [
            {
                name: "Select Target Player:",
                arg: undefined,
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the OP command logic.
     * @param {ChatSendBeforeEvent} message - The message object that contains details about the chat event.
     * @param {string[]} args - The arguments passed along with the command.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const sender = message.sender;
        const securityCheck = sender.getDynamicProperty("securityClearance") as number;

        const moduleKey = "paradoxOPSEC";
        const securityListObject = world.getDynamicProperty(moduleKey) as string;
        const securityClearanceListData: SecurityClearanceData = securityListObject ? JSON.parse(securityListObject) : { securityClearanceList: [] };

        /**
         * Adds a player to the security clearance list.
         * @param {Player} player - The player to add to the list.
         * This function adds the player to the security clearance list and sets them as the host if they are the first player.
         */
        const addPlayerToSecurityList = (player: Player) => {
            const securityClearanceList = securityClearanceListData.securityClearanceList;

            const playerInfo: PlayerInfo = {
                name: player.name,
                id: player.id,
            };

            if (securityClearanceList.length === 0) {
                securityClearanceListData.host = playerInfo; // Assign the first player as the host
            }

            if (!securityClearanceList.some((item: PlayerInfo) => item.id === player.id)) {
                securityClearanceList.push(playerInfo);
                world.setDynamicProperty(moduleKey, JSON.stringify(securityClearanceListData));
            }
            addPlayerToSecurityClearanceList(player);
        };

        /**
         * Displays the list of players with security clearance level 4.
         * @param {Player} player - The player requesting the list.
         * This function sends a message displaying the host and all players with security clearance level 4.
         */
        const displaySecurityList = (player: Player) => {
            const securityClearanceList = securityClearanceListData.securityClearanceList;

            const hostInfo = securityClearanceListData.host ? `§2Host§7: ${securityClearanceListData.host.name} (§2ID§7: ${securityClearanceListData.host.id})` : "Host: §2None";

            const formattedList = securityClearanceList.map((item: PlayerInfo, index: number) => `§2${index + 1}§7. ${item.name} (§2ID§7: ${item.id})`).join("\n");

            player.sendMessage(`\n§2[§7Paradox§2]§o§7 ${hostInfo}\n\nPlayers with Security Clearance 4:\n§2-------------------------------§7\n${formattedList}`);
        };

        /**
         * Processes the OP command logic and updates security clearance for the target player.
         * @param {SecurityClearanceData} securityClearanceListData - The current security clearance list data.
         * @param {Player} target - The target player to be granted OP status.
         * This function updates the security clearance for the sender or the target player to level 4 and adds them to the security clearance list.
         */
        const processOpCommand = (securityClearanceListData: SecurityClearanceData, target: Player) => {
            if (!securityClearanceListData.host?.id || (securityClearanceListData.host?.id === sender.id && target.id === sender.id)) {
                sender.setDynamicProperty("securityClearance", 4);
                sender.sendMessage("§2[§7Paradox§2]§o§7 You have updated your security clearance to level 4.");
                addPlayerToSecurityList(sender);
                return;
            }

            if (target.id !== sender.id) {
                target.setDynamicProperty("securityClearance", 4);
                target.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance has been updated by ${sender.name}§7!`);
                sender.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance has been updated for ${target.name}§7!`);
                addPlayerToSecurityList(target);
                return;
            }

            addPlayerToSecurityList(sender);
        };

        if (args[0] === "list") {
            if (securityCheck !== 4) {
                sender.sendMessage("§o§c[Paradox] You do not have permission to view the security clearance list.");
                return;
            }
            displaySecurityList(sender);
            return;
        }

        // Check if the sender is the host or has the required clearance
        if (!securityClearanceListData.host?.id || securityCheck === 4 || securityClearanceListData.host?.id === sender.id) {
            let targetPlayer: Player | undefined = undefined;
            const playerName: string = args.join(" ").trim().replace(/[@"]+/g, "");

            if (playerName.length > 0) {
                targetPlayer = world.getAllPlayers().find((playerObject: Player) => playerObject.name === playerName);
            }

            if (!targetPlayer && playerName.length === 0) {
                targetPlayer = sender;
            }

            if (!targetPlayer) {
                sender.sendMessage(`§o§c[Paradox] Player \"${playerName}§c\" not found.`);
                return;
            }
            processOpCommand(securityClearanceListData, targetPlayer);
        } else {
            sender.sendMessage("§o§c[Paradox] You do not have permissions!");
        }
    },
};
