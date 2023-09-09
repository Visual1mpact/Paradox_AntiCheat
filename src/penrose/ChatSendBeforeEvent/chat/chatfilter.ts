import { world } from "@minecraft/server";
import { encryptString, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { ChatChannelManager } from "../../../classes/ChatChannelManager.js";

const beforeChatFilter = () => {
    // Subscribe to the 'beforeChat' event
    world.beforeEvents.chatSend.subscribe((msg) => {
        const { message, sender: player } = msg;

        // Retrieve the 'chatranks_b' dynamic property
        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");
        // Get the channel name associated with the player
        const channelName = ChatChannelManager.getPlayerChannel(player.id);

        // Check if chat ranks are enabled
        if (!msg.sendToTargets && chatRanksBoolean === true) {
            // Check if the player is muted
            if (player.hasTag("isMuted")) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are currently muted.`);
                msg.cancel = true; // Cancel the chat message
                return;
            }

            // Get the player's tags and find their rank
            const tags = player.getTags();
            const rankTag = tags.find((tag) => tag.startsWith("Rank:")) || "Rank:Member";
            const rank = rankTag.replace("Rank:", "").replaceAll("--", "§4][§6");

            // Format the chat message with the rank
            const formattedMessage = `§4[§6${rank}§4] §7${player.name}: §r${message}`;
            // Encrypt and update the message
            msg.message = encryptString(channelName ? `§4[§6${channelName}§4] §7${player.name}: §r${message}` : formattedMessage, player.id);
            msg.sendToTargets = true; // Send the message to targets
        } else if (!msg.sendToTargets && channelName) {
            // Format the chat message for channel
            const formattedMessage = `§4[§6${channelName}§4] §f<${player.name}> §r${message}`;
            // Encrypt and update the message
            msg.message = encryptString(formattedMessage, player.id);
            msg.sendToTargets = true; // Send the message to targets
        }
    });
};

export { beforeChatFilter };
