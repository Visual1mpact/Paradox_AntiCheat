import { world } from "@minecraft/server";
import { sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { ChatChannelManager } from "../../../classes/ChatChannelManager.js";
import { EncryptionManager } from "../../../classes/EncryptionManager.js";

const beforeChatFilter = () => {
    // Subscribe to the 'beforeChat' event
    world.beforeEvents.chatSend.subscribe((msg) => {
        const { message, sender: player } = msg;

        // Check if the player is muted
        if (player.hasTag("isMuted")) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are currently muted.`);
            msg.cancel = true; // Cancel the chat message
            return;
        }

        // Retrieve the 'chatranks_b' dynamic property
        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");
        // Get the channel name associated with the player
        const channelName = ChatChannelManager.getPlayerChannel(player.id);

        // Check if chat ranks are enabled
        if (!msg.sendToTargets && chatRanksBoolean === true) {
            // Get the player's tags and find their rank
            const tags = player.getTags();
            const rankTag = tags.find((tag) => tag.startsWith("Rank:")) || "Rank:§4[§6Member§4]";
            const rank = rankTag.replace("Rank:", "").replaceAll("--", "");

            // Format the chat message with the rank
            const formattedMessage = `${rank} §7${player.name}: §r${message}`;
            // Encrypt and update the message
            msg.message = EncryptionManager.encryptString(channelName ? `§4[§6${channelName}§4] §7${player.name}: §r${message}` : formattedMessage, player.id);
            msg.sendToTargets = true; // Send the message to targets
        } else if (!msg.sendToTargets && channelName) {
            // Format the chat message for channel
            const formattedMessage = `§4[§6${channelName}§4] §f<${player.name}> §r${message}`;
            // Encrypt and update the message
            msg.message = EncryptionManager.encryptString(formattedMessage, player.id);
            msg.sendToTargets = true; // Send the message to targets
        }
    });
};

export { beforeChatFilter };
