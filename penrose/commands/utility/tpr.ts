import { Player, ChatSendBeforeEvent, TicksPerSecond, world, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";
import { EventCoordinator } from "../../classes/event-coordinator";

interface TeleportRequest {
    sender: Player;
    receiver: Player;
    timeoutId: number;
}

/** Maps receiver ID to the request object */
const pendingRequests = new Map<string, TeleportRequest>();
/** Maps sender ID to the receiver ID they requested (to prevent spamming multiple people) */
const outgoingRequests = new Map<string, string>();

const TIMEOUT_SECONDS = 60;
const TPS = TicksPerSecond;

/** Prevents duplicate event registration if the module is re-evaluated. */
let isCleanupRegistered = false;

/**
 * Registers the playerLeave cleanup logic for the TPR system.
 * Uses a guard to ensure the listener is only registered once.
 */
function registerTprCleanup() {
    if (isCleanupRegistered) return;

    EventCoordinator.subscribeAfter("playerLeave", (event) => {
        const playerId = event.playerId;
        if (pendingRequests.has(playerId)) cancelTeleportRequest(playerId);
        if (outgoingRequests.has(playerId)) cancelTeleportRequest(outgoingRequests.get(playerId)!);
    });

    isCleanupRegistered = true;
}

registerTprCleanup();

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
        description:
            "Manage teleport requests between players.\n\n" +
            "§7• Send a request to teleport to another player.\n" +
            "§7• Accept or deny incoming teleport requests.\n" +
            "§7• Requests automatically expire after 60 seconds.\n" +
            "§7• Cannot be used while imprisoned.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Send Teleport Request",
                description: "Send a request to a player",
                icon: "textures/ui/send_icon.png",
                requiredFields: ["PlayerName"],
                generateModalForm: true,
            },
            {
                name: "Accept Teleport Request",
                command: ["accept"],
                icon: "textures/ui/onlineLight.png",
                description: "Accept received request",
            },
            {
                name: "Deny Teleport Request",
                command: ["deny"],
                icon: "textures/gui/newgui/offlineLight.png",
                description: "Deny received request",
            },
        ],
        dynamicFields: [
            {
                type: "dropdown",
                sourceType: "players",
                name: "\nSelect Players Name:",
                requiredFields: ["PlayerName"],
            },
        ],
    },

    /**
     * Executes the tpr command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args?: string[]) => {
        if (!message) return;
        args = args ?? [];
        const sender = message.sender;

        // Retrieve the current prefix from dynamic properties
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";

        // Prevent command if player is imprisoned
        const isImprisoned = sender.getDynamicProperty("prisonLocation"); // matches PRISON_LOCATION_PROPERTY
        if (isImprisoned) {
            sender.sendMessage(`§o§c[Paradox] You cannot use the tpr command while imprisoned!`);
            return;
        }

        /**
         * Function to accept a teleport request.
         * @param {Player} receiver - The player receiving the teleport request.
         */
        function acceptTeleportRequest(receiver: Player) {
            const request = pendingRequests.get(receiver.id);
            if (request) {
                const sender = request.sender;
                const receiverName = receiver.name;

                // Check if sender is still valid before teleporting
                if (sender && sender.isValid) {
                    sender.teleport(receiver.location, { dimension: receiver.dimension });
                    sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request accepted. Teleporting to ${receiverName}§7.`);
                    receiver.sendMessage(`§2[§7Paradox§2]§o§7 You accepted the teleport request from ${sender.name}§7.`);
                } else {
                    receiver.sendMessage(`§o§c[Paradox] The sender is no longer online.`);
                }

                cancelTeleportRequest(receiver.id);
            } else {
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You have no pending teleport requests.`);
                return;
            }
        }

        /**
         * Function to deny a teleport request.
         * @param {Player} receiver - The player receiving the teleport request.
         */
        function denyTeleportRequest(receiver: Player) {
            const request = pendingRequests.get(receiver.id);
            if (request) {
                const sender = request.sender;
                if (sender && sender.isValid) sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 denied your teleport request.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You denied the teleport request from ${sender?.name ?? "Unknown"}§7.`);
                cancelTeleportRequest(receiver.id);
            } else {
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You have no pending teleport requests.`);
            }
        }

        // Handle accept and deny responses
        const command = args[0] ? args[0].toLowerCase() : "";

        switch (command) {
            case "accept": {
                acceptTeleportRequest(sender);
                return;
            }
            case "deny": {
                denyTeleportRequest(sender);
                return;
            }
            case "": {
                message.sender.sendMessage(`§o§c[Paradox] Invalid arguments. For help, use ${prefix}§ctpr help.`);
                return;
            }
        }

        // Handle sending a teleport request
        const receiverName = args.join(" ").trim().replace(/["@]/g, "");
        const receiver = PlayerCache.getPlayerByName(receiverName);

        if (!receiver) {
            sender.sendMessage(`§o§c[Paradox] Player '${receiverName}§c' not found.`);
            return;
        }

        // Prevent self-request
        if (sender.id === receiver.id) {
            sender.sendMessage("§o§c[Paradox] You cannot send a teleport request to yourself.");
            return;
        }

        // Check if the sender already has an outgoing request elsewhere
        if (outgoingRequests.has(sender.id)) {
            sender.sendMessage("§o§c[Paradox] You already have a pending outgoing teleport request.");
            return;
        }

        // Check if receiver already has a request
        if (pendingRequests.has(receiver.id)) {
            sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 is already handling a teleport request.`);
            return;
        }

        const timeoutId = system.runTimeout(() => {
            if (sender.isValid) sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiver.name}§7 did not respond in time. Teleport request canceled.`);
            if (receiver.isValid) receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the teleport request in time. Request canceled.`);
            cancelTeleportRequest(receiver.id);
        }, TIMEOUT_SECONDS * TPS);

        pendingRequests.set(receiver.id, { sender, receiver, timeoutId });
        outgoingRequests.set(sender.id, receiver.id);

        sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleport request sent to ${receiver.name}§7.`);
        receiver.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name}§7 wants to teleport to you. Type ${prefix}§7tpr accept to accept or ${prefix}§7tpr deny to deny.`);
    },
};

/**
 * Function to cancel a teleport request.
 * @param {string} receiverId - The ID of the player receiving the teleport request.
 */
function cancelTeleportRequest(receiverId: string) {
    const request = pendingRequests.get(receiverId);
    if (request) {
        system.clearRun(request.timeoutId);
        // Remove from outgoing map
        for (const [sId, rId] of outgoingRequests.entries()) {
            if (rId === receiverId) {
                outgoingRequests.delete(sId);
                break;
            }
        }
        pendingRequests.delete(receiverId);
    }
}
