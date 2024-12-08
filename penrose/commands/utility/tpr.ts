import { Player, ChatSendBeforeEvent, TicksPerSecond } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "Teleport Request",
        description: "Send, accept, or deny tp requests",
        commandOrder: undefined,
        actions: [
            {
                name: "Send Teleport Request",
                command: ["tpr"],
                description: "Send a request to a player",
                requiredFields: ["Player Name"],
                crypto: false,
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
                name: "Player Name",
                placeholder: "Select player's name",
                arg: undefined,
            },
        ],
    },

    /**
     * Executes the tpr command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

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
                sender.teleport(receiver.location);
                sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request accepted. Teleporting to ${receiverName}.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You accepted the teleport request from ${sender.name}.`);
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
                sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName} denied your teleport request.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You denied the teleport request from ${sender.name}.`);
                cancelTeleportRequest(receiverName);
            } else {
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You have no pending teleport requests.`);
            }
        }

        // Handle accept and deny responses
        const command = args[0] ? args[0].toLowerCase() : "";

        switch (command) {
            case "accept":
                system.run(() => {
                    acceptTeleportRequest(message.sender);
                });
                return;
            case "deny":
                system.run(() => {
                    denyTeleportRequest(message.sender);
                });
                return;
            case "":
                const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";
                message.sender.sendMessage(`§cInvalid arguments. For help, use ${prefix}tpr help.`);
                return;
        }

        // Handle sending a teleport request
        if (args.length < 1) {
            message.sender.sendMessage("§cPlease provide a player name.");
            return;
        }

        const receiverName = args.join(" ").replace(/[@"]/g, "").trim();
        const receiver = getPlayerObject(receiverName);

        if (!receiver) {
            message.sender.sendMessage(`§cPlayer '${receiverName}' not found.`);
            return;
        }

        const sender = message.sender;

        // Check if there is already a pending teleport request for the receiver
        if (pendingRequests.has(receiver.name)) {
            sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name} is already handling a teleport request.`);
            return;
        }

        // Check if receiver is already pending a request by iterating through existing requests
        for (const request of pendingRequests.values()) {
            if (request.receiver.name === receiver.name) {
                sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name} is already handling a teleport request.`);
                return;
            }
        }

        const timeoutId = system.runTimeout(() => {
            cancelTeleportRequest(receiver.name);
            sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name} did not respond in time. Teleport request canceled.`);
            receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the teleport request in time. Request canceled.`);
        }, TIMEOUT_SECONDS * TPS);

        pendingRequests.set(receiver.name, { sender, receiver, timeoutId });

        // Retrieve the current prefix from dynamic properties
        const currentPrefix: string = (world.getDynamicProperty("__prefix") as string) ?? "!";

        sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request sent to ${receiver.name}.`);
        receiver.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name} wants to teleport to you. Type ${currentPrefix}tpr accept to accept or ${currentPrefix}tpr deny to deny.`);
    },
};
