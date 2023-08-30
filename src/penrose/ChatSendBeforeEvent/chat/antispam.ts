import { ChatSendBeforeEvent, PlayerLeaveAfterEvent, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../../util.js";

const spamTime = 2 * 1000; // The time frame during which the player's messages will be counted.
const offenseCount = 5; // Total strikes until you are kicked out.
const strikeReset = 30 * 1000; // The time frame until the strike is reduced
const lastChanceWarning = "Final warning: Continued rapid messaging will result in a ban.";

const warningMessages = [
    "Please refrain from sending messages too quickly.",
    "Messaging too frequently may result in disruptions.",
    "Slow down your messaging pace to maintain chat quality.",
    "Sending messages rapidly can lead to temporary restrictions.",
    "Avoid spamming the chat with quick messages.",
    "Remember to allow some time between messages.",
    "Excessive messaging speed can lead to chat limitations.",
    "Maintain a reasonable pace while using the chat.",
    "Help keep the chat readable by sending messages thoughtfully.",
    "Keep in mind that messaging too quickly might be limited.",
];

interface ChatRecord {
    count: number;
    lastTime: number;
    offense: number;
    lastOffenseTime: number;
}

const chatRecords = new Map<string, ChatRecord>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    chatRecords.delete(playerName);
}

function getRandomWarningMessage() {
    const randomIndex = Math.floor(Math.random() * warningMessages.length);
    return warningMessages[randomIndex];
}

function beforeantispam(msg: ChatSendBeforeEvent) {
    // Get Dynamic Property
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");

    // Unsubscribe if disabled in-game
    if (antiSpamBoolean === false) {
        chatRecords.clear();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
        world.beforeEvents.chatSend.unsubscribe(beforeantispam);
        return;
    }

    // Store player object
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Ignore those with permissions
    if (uniqueId !== player.name) {
        const now = Date.now();
        let chatRecord = chatRecords.get(player.id);

        if (!chatRecord) {
            // Initialize a new chat record for the player
            chatRecord = { count: 0, lastTime: now, offense: 0, lastOffenseTime: now };
            chatRecords.set(player.id, chatRecord);
            chatRecord = chatRecords.get(player.id);
        }

        if (now - chatRecord.lastTime > spamTime) {
            // Reset count if time frame has expired
            chatRecord.count = 0;
        } else if (now !== chatRecord.lastTime) {
            // Send a random warning message
            if (chatRecord.offense === offenseCount - 2) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f ${lastChanceWarning}`);
            } else {
                const randomWarningMessage = getRandomWarningMessage();
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f ${randomWarningMessage}`);
            }
            msg.sendToTargets = true;
            chatRecord.offense++;
            chatRecord.lastOffenseTime = now;
        }

        chatRecord.count++;
        chatRecord.lastTime = now;

        chatRecords.set(player.id, chatRecord);

        if (chatRecord.offense >= offenseCount) {
            msg.sendToTargets = true;
            // Add tag information to the message
            msg.message = `;tag:${player.name},Reason:Spamming,By:Paradox,isBanned`;
            chatRecords.delete(player.id);
        } else if (chatRecord.offense > 0 && now - chatRecord.lastOffenseTime >= strikeReset) {
            chatRecord.offense--;
            chatRecord.lastOffenseTime = now;
        }
    }
}

const beforeAntiSpam = () => {
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
    world.beforeEvents.chatSend.subscribe(beforeantispam);
};

export { beforeAntiSpam };
