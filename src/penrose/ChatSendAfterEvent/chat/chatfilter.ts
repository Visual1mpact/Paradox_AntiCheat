import { world } from "@minecraft/server";
import { chatChannels, decryptString, getPlayerById, getPlayerChannel, sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

const afterChatFilter = () => {
    // Subscribe to the 'afterChat' event
    world.afterEvents.chatSend.subscribe((msg) => {
        // Destructure 'message' and 'sender' properties from the 'msg' object
        const { message, sender: player } = msg;

        // Retrieve the 'chatranks_b' dynamic property
        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");

        // Get the channel name associated with the player
        const channelName = getPlayerChannel(player.id);

        if (chatRanksBoolean === true) {
            // Format the chat message
            const formattedMessage = decryptString(message, player.id);
            msg.message = formattedMessage;

            // Set 'sendToTargets' flag to false
            msg.sendToTargets = false;

            if (!msg.sendToTargets) {
                if (channelName) {
                    // Retrieve player objects of members in the same channel
                    const channelMembers = chatChannels[channelName].members;
                    const targetPlayers = [];

                    // Iterate through channel members
                    for (const memberID of channelMembers) {
                        const player = getPlayerById(memberID);
                        if (player !== null) {
                            targetPlayers.push(player.name);
                        }
                    }

                    // Send the formatted chat message to target players
                    if (targetPlayers.length > 0) {
                        sendMsg(targetPlayers, formattedMessage);

                        // Clear targetPlayers array after use
                        targetPlayers.length = 0;
                    }
                } else {
                    // Send the formatted chat message to all players
                    sendMsg("@a", formattedMessage);
                }

                // Set 'sendToTargets' flag to true
                msg.sendToTargets = true;
            }

            return;
        }

        // Process chat message when 'chatRanksBoolean' is false
        if (channelName) {
            // Set 'sendToTargets' flag to false
            msg.sendToTargets = false;

            // Format the chat message
            const formattedMessage = decryptString(message, player.id);
            msg.message = formattedMessage;

            // Retrieve player objects of members in the same channel
            const channelMembers = chatChannels[channelName].members;
            const targetPlayers = [];

            // Iterate through channel members
            for (const memberID of channelMembers) {
                const player = getPlayerById(memberID);
                if (player !== null) {
                    targetPlayers.push(player.name);
                }
            }

            // Send the formatted chat message to target players
            if (targetPlayers.length > 0) {
                sendMsg(targetPlayers, formattedMessage);

                // Clear targetPlayers array after use
                targetPlayers.length = 0;
            }

            // Set 'sendToTargets' flag to true
            msg.sendToTargets = true;
        }
    });
};

export { afterChatFilter };
