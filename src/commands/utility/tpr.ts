import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config";
import { getPrefix, sendMsgToPlayer, setTimer } from "../../util";

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
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: tpr`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: tpr [optional]`,
        `§4[§6Optional§4]§r: name, help`,
        `§4[§6Description§4]§r: Will send requests to tp to players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tpr ${player.name}`,
        `    ${prefix}tpr help`,
    ]);
}

// This handles the submission of requests
function teleportRequestHandler({ sender, message }: BeforeChatEvent) {
    const player = sender;
    const args = message.split(" ");
    if (args.length !== 2) return;
    const targetName = args[1];

    const targets = world.getAllPlayers().filter((p: Player) => p.name === targetName);
    if (targets.length === 0) {
        sendMsgToPlayer(player, "§r§4[§6Paradox§4]§r Target player not found.");
        return;
    }

    const target = targets[0];

    if (teleportRequests.some((r) => r.target === target)) {
        sendMsgToPlayer(player, "§r§4[§6Paradox§4]§r That player already has a teleport request pending.");
        return;
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

    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleport request sent to ${target.name}. Waiting for approval...`);
    sendMsgToPlayer(target, `§r§4[§6Paradox§4]§r You have received a teleport request from ${player.name}. Type 'approved' or 'denied' in chat to respond.`);
}

// This handles requests pending approval
function teleportRequestApprovalHandler({ sender, message, cancel }: BeforeChatEvent) {
    if (message.toLowerCase().match(/^(approved|denied|approve|deny)$/)) {
        cancel = true;

        const player = sender;

        const requestIndex = teleportRequests.findIndex((r) => r.target === player);
        // Target doesn't exist so return
        if (requestIndex === -1) return;

        const request = teleportRequests[requestIndex];
        if (Date.now() >= request.expiresAt) {
            sendMsgToPlayer(request.requester, "§r§4[§6Paradox§4]§r Teleport request expired. Please try again.");
            teleportRequests.splice(requestIndex, 1);
            return;
        }

        const validMessages = ["approved", "approve"];

        if (validMessages.some((msg) => msg === message)) {
            setTimer(request.requester.name);
            request.requester.teleport(request.target.location, request.target.dimension, 0, 0, false);
            sendMsgToPlayer(request.requester, `§r§4[§6Paradox§4]§r Teleport request to ${request.target.name} is approved.`);
        } else {
            sendMsgToPlayer(request.requester, `§r§4[§6Paradox§4]§r Teleport request to ${request.target.name} is denied.`);
        }

        teleportRequests.splice(requestIndex, 1);
    }
}

export function TeleportRequestHandler({ sender, message, cancel }: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/tpr.js:71)");
    }

    cancel = true;

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
        } as BeforeChatEvent;
        teleportRequestHandler(event);
        world.events.beforeChat.subscribe(teleportRequestApprovalHandler);
    }

    // This is for the GUI when sending approvals or denials
    const validMessages = ["approved", "approve", "denied", "deny"];

    if (validMessages.some((msg) => msg === message)) {
        const event = {
            sender,
            message,
        } as BeforeChatEvent;
        teleportRequestApprovalHandler(event);
    }
}