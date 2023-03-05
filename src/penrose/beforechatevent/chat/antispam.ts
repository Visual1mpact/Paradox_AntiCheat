import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { crypto, sendMsgToPlayer } from "../../../util.js";
import config from "../../../data/config.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

const spamList = new WeakMap<Player, { lastSendTime: number; lastMessage: string; spamCounter: number }>();

function antispam(msg: BeforeChatEvent) {
    // Get Dynamic Property
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");

    // Unsubscribe if disabled in-game
    if (antiSpamBoolean === false) {
        World.events.beforeChat.unsubscribe(antispam);
        return;
    }
    // Store player object
    const player = msg.sender;
    const message = msg.message;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        // gets current time
        const currentTime = Date.now();

        // gets spam data (and sets one if doesn't exist)
        if (!spamList.has(player)) spamList.set(player, { lastMessage: message, lastSendTime: -Infinity, spamCounter: 0 });
        const spamData = spamList.get(player);

        let check = true;

        // resets spam data
        if (currentTime - spamData.lastSendTime >= config.modules.antispam.cooldown * 50) {
            check = false;
            spamData.lastMessage = message;
            spamData.lastSendTime = currentTime;
            spamData.spamCounter = 0;
        }

        // Specific to Horion
        if (message.includes("the best minecraft bedrock utility mod")) {
            spamData.spamCounter = Infinity;
        }

        if (check) {
            // check if the player sends the same message with the previous one, otherwise resets the spam counter
            if (spamData.lastMessage === message) {
                spamData.spamCounter++;
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Do not spam the chat!`);
                msg.cancel = true;
            }
            // check if the player sends a message during cooldown
            else {
                msg.cancel = true;
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are sending too many messages in a short time!`);
            }
        }

        // check if the spam counter goes above the threshold
        if (spamData.spamCounter > 12) {
            try {
                player.addTag("Reason:Spamming");
                player.addTag("By:Paradox");
                player.addTag("isBanned");
            } catch (error) {
                kickablePlayers.add(player);
                player.triggerEvent("paradox:kick");
            }
        }
    }
}

const AntiSpam = () => {
    World.events.beforeChat.subscribe(antispam);
};

export { AntiSpam };
