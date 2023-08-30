import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config";
import { decryptString, getPrefix, sendMsgToPlayer, setTimer } from "../../util";

interface TeleportRequest {
    requester: Player;
    target: Player;
    expiresAt: number;
}

const teleportRequests: TeleportRequest[] = [];

// This allows us to read from the teleportRequests array without
// creating a memory leak by accidentally modifying its contents.
export function getTeleportRequests(): TeleportRequest[] {
    return teleportRequests;
}

function tprHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.tpr) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: tpr`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: tpr [optional]`,
        `§4[§6Optional§4]§f: name, help`,
        `§4[§6Description§4]§f: Will send requests to tp to players.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}tpr ${player.name}`,
        `        §4- §6Send a teleport request to the specified player§f`,
        `    ${prefix}tpr help`,
        `        §4- §6Show command help§f`,
    ]);
}

// This handles the submission of requests
function teleportRequestHandler({ sender, message }: ChatSendAfterEvent) {
    const player = sender;
    const args = message.split(" ");
    if (args.length < 2) return;

    // Extract the target name from the message, including the "@" symbol
    const targetName = args[1].trim();

    // Try to find the player requested, including the "@" symbol
    let target: Player | undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(targetName.toLowerCase().replace(/"|\\|@/g, ""))) {
            target = pl;
            break;
        }
    }

    if (!target) {
        sendMsgToPlayer(player, "§f§4[§6Paradox§4]§f Target player not found.");
        return;
    }

    const requestIndex = teleportRequests.findIndex((r) => r.target === target);
    if (requestIndex !== -1) {
        const request = teleportRequests[requestIndex];
        if (Date.now() >= request.expiresAt) {
            teleportRequests.splice(requestIndex, 1);
        } else {
            sendMsgToPlayer(player, "§f§4[§6Paradox§4]§f That player already has a teleport request pending.");
            return;
        }
    }

    /**
     * 1000 milliseconds per second
     * 60 seconds per minute, or 60000 milliseconds per minute
     * 60 minutes per hour, or 3600000 milliseconds per hour
     * 24 hours per day, or 86400000 milliseconds per day
     */
    const { tprExpiration } = config.modules;
    const durationInMs = tprExpiration.seconds * 1000 + tprExpiration.minutes * 60000 + tprExpiration.hours * 3600000 + tprExpiration.days * 86400000;

    teleportRequests.push({
        requester: player,
        target,
        expiresAt: Date.now() + durationInMs, // Expires in the time specified in 'durationInMs'
    });

    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Teleport request sent to ${target.name}. Waiting for approval...`);
    sendMsgToPlayer(target, `§f§4[§6Paradox§4]§f You have received a teleport request from ${player.name}. Type 'approved' or 'denied' in chat to respond.`);
}

// This handles requests pending approval
function teleportRequestApprovalHandler(object: ChatSendAfterEvent) {
    const { sender, message } = object;

    const lowercaseMessage = decryptString(message, sender.id).toLowerCase();
    // Extract the response from the decrypted string
    const refChar = lowercaseMessage.split("§r");
    const extractedPhrase = refChar[1];
    const isApprovalRequest = extractedPhrase === "approved" || extractedPhrase === "approve";
    const isDenialRequest = extractedPhrase === "denied" || extractedPhrase === "deny";

    if (!isApprovalRequest && !isDenialRequest) {
        return;
    }

    const player = sender;

    object.sendToTargets = true;

    // Target is the player with the request and player is the same target responding to the request
    const requestIndex = teleportRequests.findIndex((r) => r.target === player);
    // Target doesn't exist so return
    if (requestIndex === -1) return;

    const request = teleportRequests[requestIndex];
    if (Date.now() >= request.expiresAt) {
        sendMsgToPlayer(request.requester, "§f§4[§6Paradox§4]§f Teleport request expired. Please try again.");
        sendMsgToPlayer(request.target, "§f§4[§6Paradox§4]§f Teleport request expired. Please try again.");
        teleportRequests.splice(requestIndex, 1);
        return;
    }

    if (isApprovalRequest) {
        setTimer(request.requester.id);
        request.requester.teleport(request.target.location, { dimension: request.target.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        sendMsgToPlayer(request.requester, `§f§4[§6Paradox§4]§f Teleport request to ${request.target.name} is approved.`);
    } else {
        sendMsgToPlayer(request.requester, `§f§4[§6Paradox§4]§f Teleport request to ${request.target.name} is denied.`);
    }

    teleportRequests.splice(requestIndex, 1);
}

export function TeleportRequestHandler({ sender, message }: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/tpr.js:71)");
    }

    const player = sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return tprHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.tpr) {
        return tprHelp(player, prefix);
    }

    // Handle submitted requests here
    if (message.startsWith(`${prefix}tpr`)) {
        const event = {
            sender,
            message,
        } as ChatSendAfterEvent;
        teleportRequestHandler(event);
    }

    // This is for the GUI when sending approvals or denials
    const validMessages = ["approved", "approve", "denied", "deny"];

    if (validMessages.some((msg) => msg === message)) {
        const event = {
            sender,
            message,
        } as ChatSendAfterEvent;
        teleportRequestApprovalHandler(event);
    }
}

// Subscribe to teleportRequestApprovalHandler
const TpRequestListener = () => {
    // If TPR is not disabled
    const validate = config.customcommands.tpr;
    if (validate) {
        world.afterEvents.chatSend.subscribe(teleportRequestApprovalHandler);
    }
};

export { TpRequestListener };
