import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer, startTimer } from "../../../util.js";

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

function beforeantispam(msg: ChatSendBeforeEvent) {
    // Get Dynamic Property
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");

    // Unsubscribe if disabled in-game
    if (antiSpamBoolean === false) {
        chatRecords.clear();
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
        const chatRecord = chatRecords.get(player.name) ?? { count: 0, lastTime: now, offense: 0, lastOffenseTime: now };

        if (now - chatRecord.lastTime > spamTime) {
            // Reset count if time frame has expired
            chatRecord.count = 0;
        }

        chatRecord.count++;
        chatRecord.lastTime = now;

        chatRecords.set(player.name, chatRecord);
        /**
         * startTimer will make sure the key is properly removed
         * when the time for theVoid has expired. This will preserve
         * the integrity of our Memory.
         */
        const timerExpired = startTimer("antispam", player.name, Date.now());
        if (timerExpired.namespace.indexOf("antispam") !== -1 && timerExpired.expired) {
            const deletedKey = timerExpired.key; // extract the key without the namespace prefix
            chatRecords.delete(deletedKey);
        }

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
    world.beforeEvents.chatSend.subscribe(beforeantispam);
};

export { beforeAntiSpam };
