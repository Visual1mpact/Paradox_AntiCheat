import { BeforeChatEvent, world } from "@minecraft/server";
import { sendMsgToPlayer, startTimer } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const chatSpamLimit = 3; // The maximum number of messages a player can send in the spamTime frame.
const spamTime = 2 * 1000; // The time frame during which the player's messages will be counted.
const offenseCount = 3; // Total strikes until you are kicked out.
const strikeReset = 60 * 1000; // The time frame until the strike is reduced

interface ChatRecord {
    count: number;
    lastTime: number;
    offense: number;
    lastOffenseTime: number;
}

const chatRecords = new Map<string, ChatRecord>();

function antispam(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");

    // Unsubscribe if disabled in-game
    if (antiSpamBoolean === false) {
        chatRecords.clear();
        world.events.beforeChat.unsubscribe(antispam);
        return;
    }

    // Store player object
    const player = msg.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        const now = Date.now();
        const chatRecord = chatRecords.get(player.name) ?? { count: 0, lastTime: now, offense: 0, lastOffenseTime: now };

        if (now - chatRecord.lastTime > spamTime) {
            // Reset count if time frame has expired
            chatRecord.count = 0;
            chatRecord.lastTime = now;
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
        if (timerExpired.includes("antispam")) {
            const deletedKey = timerExpired.split(":")[1]; // extract the key without the namespace prefix
            chatRecords.delete(deletedKey);
        }

        if (chatRecord.count > chatSpamLimit) {
            msg.cancel = true;
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are sending too many messages in a short time!`);
            chatRecord.offense++;
            chatRecord.lastOffenseTime = now;
        } else if (chatRecord.offense >= offenseCount) {
            chatRecords.delete(player.name);
            try {
                player.addTag("Reason:Spamming");
                player.addTag("By:Paradox");
                player.addTag("isBanned");
            } catch (error) {
                kickablePlayers.add(player);
                player.triggerEvent("paradox:kick");
            }
        } else if (chatRecord.offense > 0 && now - chatRecord.lastOffenseTime >= strikeReset) {
            chatRecord.offense--;
            chatRecord.lastOffenseTime = now;
        }
    }
}

const AntiSpam = () => {
    world.events.beforeChat.subscribe(antispam);
};

export { AntiSpam };
