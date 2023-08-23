import { Player, world } from "@minecraft/server";
import { chatChannels, getPlayerById, getPlayerChannel, sendMsg, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

const ChatFilter = () => {
    // Subscribe to the 'beforeChat' event
    world.beforeEvents.chatSend.subscribe((msg) => {
        let { message, sender: player } = msg; // Destructure 'message' and 'sender' properties from the 'msg' object

        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b"); // Retrieve the 'chatranks_b' dynamic property

        // Get the channel name associated with the player
        const channelName = getPlayerChannel(player.id);

        if (chatRanksBoolean === true) {
            // Check if 'chatranks_b' is enabled
            // Prevent chat from muted players
            if (player.hasTag("isMuted")) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are currently muted.`); // Notify the player
                msg.cancel = true; // Cancel the chat message
                return;
            }

            const tags = player.getTags(); // Get the player's tags
            const rank =
                tags
                    .find((tag) => tag.startsWith("Rank:")) // Find the first tag that starts with 'Rank:'
                    ?.replace("Rank:", "") // Remove 'Rank:' from the tag string
                    ?.replaceAll("--", "§f§4][§6") || "Member"; // Replace '--' with '§f§4][§6' in the tag string, or use 'Member' as default
            let formattedMessage = `§4[§6${rank}§4] §7${player.name}: §r${message}`; // Format the chat message

            if (!msg.sendToTargets) {
                if (channelName) {
                    // Player is in a chat channel
                    const channelMessage = `§4[§6${channelName}§4] §7${player.name}: §r${message}`;

                    // Retrieve player objects of members in the same channel
                    const channelMembers = chatChannels[channelName].members;
                    const targetPlayers: string[] = [];

                    channelMembers.forEach((memberID) => {
                        const player = getPlayerById(memberID);
                        if (player !== null) {
                            targetPlayers.push(player.name);
                        }
                    });

                    if (targetPlayers.length > 0) {
                        sendMsg(targetPlayers, channelMessage); // Send the formatted chat message to all players

                        // Clear targetPlayers after use
                        targetPlayers.length = 0;
                    }
                } else {
                    sendMsg("@a", formattedMessage); // Send the formatted chat message to all players
                }
                msg.sendToTargets = true;
            }

            return;
        }
        if (channelName) {
            // Player is in a chat channel
            const formattedMessage = `§4[§6${channelName}§4] §r${message}`;

            // Retrieve player objects of members in the same channel
            const channelMembers = chatChannels[channelName].members;
            const targetPlayers: Player[] = [];

            channelMembers.forEach((memberID) => {
                const player = getPlayerById(memberID);
                if (player !== null) {
                    targetPlayers.push(player);
                }
            });

            // Update the message sender's targets to include players in the same chat channel
            msg.setTargets(targetPlayers);

            msg.message = formattedMessage;

            msg.sendToTargets = true;

            // Clear targetPlayers after use
            targetPlayers.length = 0;
        }
    });
};

export { ChatFilter };
