import { Player, ChatSendBeforeEvent, TicksPerSecond, world, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

interface TeleportRequest {
    sender: Player;
    receiver: Player;
    timeoutId: number;
}

const pendingRequests = new Map<string, TeleportRequest>();
const TIMEOUT_SECONDS = 60;
const TPS = TicksPerSecond;

/**
 * Represents the tpr command.
 */
export const tprCommand: Command = {
    name: "tpr",
    description: "Send a teleport request to another player.",
    usage: "{prefix}tpr <player | accept | deny | help>",
    examples: [`{prefix}tpr Lucy`, `{prefix}tpr Steve`, `{prefix}tpr accept`, `{prefix}tpr deny`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/blocks/end_portal.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Teleport Request",
        description: "Send, accept, or deny tp requests.\n\n",
        commandOrder: undefined,
        actions: [
            {
                name: "Send Teleport Request",
                command: undefined,
                description: "Send a request to a player",
                requiredFields: ["PlayerName"],
                crypto: false,
                generateModalForm: true,
            },
            {
                name: "Accept Teleport Request",
                command: ["accept"],
                description: "Accept received request",
                requiredFields: [],
                crypto: false,
            },
            {
                name: "Deny Teleport Request",
                command: ["deny"],
                description: "Deny received request",
                requiredFields: [],
                crypto: false,
            },
        ],
        dynamicFields: [
            {
                type: "dropdown",
                sourceType: "players",
                name: "Select Players Name:",
                arg: undefined,
                requiredFields: ["PlayerName"],
            },
        ],
    },

    /**
     * Executes the tpr command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player | undefined {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        /**
         * Function to cancel a teleport request.
         * @param {string} receiverName - The name of the player receiving the teleport request.
         */
        function cancelTeleportRequest(receiverName: string) {
            const request = pendingRequests.get(receiverName);
            if (request) {
                system.clearRun(request.timeoutId);
                pendingRequests.delete(receiverName);
            }
        }

        /**
         * Function to accept a teleport request.
         * @param {Player} receiver - The player receiving the teleport request.
         */
        function acceptTeleportRequest(receiver: Player) {
            const receiverName = receiver.name;
            const request = pendingRequests.get(receiverName);
            if (request) {
                const sender = request.sender;
                sender.teleport(receiver.location, { dimension: receiver.dimension });
                sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request accepted. Teleporting to ${receiverName}§7.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You accepted the teleport request from ${sender.name}§7.`);
                cancelTeleportRequest(receiverName);
            } else {
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You have no pending teleport requests.`);
            }
        }

        /**
         * Function to deny a teleport request.
         * @param {Player} receiver - The player receiving the teleport request.
         */
        function denyTeleportRequest(receiver: Player) {
            const receiverName = receiver.name;
            const request = pendingRequests.get(receiverName);
            if (request) {
                const sender = request.sender;
                sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName}§7 denied your teleport request.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You denied the teleport request from ${sender.name}§7.`);
                cancelTeleportRequest(receiverName);
            } else {
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You have no pending teleport requests.`);
            }
        }

        // Handle accept and deny responses
        const command = args[0] ? args[0].toLowerCase() : "";

        switch (command) {
            case "accept": {
                acceptTeleportRequest(message.sender);
                return;
            }
            case "deny": {
                denyTeleportRequest(message.sender);
                return;
            }
            case "": {
                const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
                message.sender.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§ctpr help.`);
                return;
            }
        }

        // Handle sending a teleport request
        if (args.length < 1) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name.");
            return;
        }

        const receiverName = args.join(" ").replace(/[@"]/g, "").trim();
        const receiver = getPlayerObject(receiverName);

        if (!receiver) {
            message.sender.sendMessage(`§o§c[Paradox] Player '${receiverName}§c' not found.`);
            return;
        }

        const sender = message.sender;

        // Check if there is already a pending teleport request for the receiver
        if (pendingRequests.has(receiver.name)) {
            sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 is already handling a teleport request.`);
            return;
        }

        // Check if receiver is already pending a request by iterating through existing requests
        for (const request of pendingRequests.values()) {
            if (request.receiver.name === receiver.name) {
                sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 is already handling a teleport request.`);
                return;
            }
        }

        const timeoutId = system.runTimeout(() => {
            cancelTeleportRequest(receiver.name);
            sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 did not respond in time. Teleport request canceled.`);
            receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the teleport request in time. Request canceled.`);
        }, TIMEOUT_SECONDS * TPS);

        pendingRequests.set(receiver.name, { sender, receiver, timeoutId });

        // Retrieve the current prefix from dynamic properties
        const currentPrefix: string = (world.getDynamicProperty("__prefix") as string) ?? "!";

        sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request sent to ${receiver.name}§7.`);
        receiver.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name}§7 wants to teleport to you. Type ${currentPrefix}§7tpr accept to accept or ${currentPrefix}§7tpr deny to deny.`);
    },
};
