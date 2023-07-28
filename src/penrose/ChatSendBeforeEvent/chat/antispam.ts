import { ChatSendBeforeEvent, PlayerLeaveAfterEvent, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../../util.js";

const chatSpamLimit = 3; // The maximum number of messages a player can send in the spamTime frame.
const spamTime = 2 * 1000; // The time frame during which the player's messages will be counted.
const offenseCount = 3; // Total strikes until you are kicked out.
const strikeReset = 30 * 1000; // The time frame until the strike is reduced

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
        const chatRecord = chatRecords.get(player.id) ?? { count: 0, lastTime: now, offense: 0, lastOffenseTime: now };

        if (now - chatRecord.lastTime > spamTime) {
            // Reset count if time frame has expired
            chatRecord.count = 0;
        }

        chatRecord.count++;
        chatRecord.lastTime = now;

        chatRecords.set(player.id, chatRecord);

        if (chatRecord.count > chatSpamLimit) {
            msg.sendToTargets = true;
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are sending too many messages in a short time!`);
            chatRecord.offense++;
            chatRecord.lastOffenseTime = now;
        }
        if (chatRecord.offense >= offenseCount) {
            msg.sendToTargets = true;
            // Add tag information to the message
            msg.message = `;tag:${player.name},Reason:Spamming,By:Paradox,isBanned`;
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
