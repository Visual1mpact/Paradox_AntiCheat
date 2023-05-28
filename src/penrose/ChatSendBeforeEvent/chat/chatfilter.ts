import { world } from "@minecraft/server";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeEvent/registry.js";

// Chat filter function
const ChatFilter = () => {
    // Subscribe to the 'beforeChat' event
    world.beforeEvents.chatSend.subscribe((msg) => {
        const { message, sender: player } = msg; // Destructure 'message' and 'sender' properties from the 'msg' object

        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b"); // Get the 'chatranks_b' dynamic property

        if (chatRanksBoolean === true) {
            // If 'chatranks_b' is true
            // Kill their broadcast if muted
            if (player.hasTag("isMuted")) {
                // Check if the player has the 'isMuted' tag
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are currently muted.`); // Send a message to the player
                msg.cancel = true; // Cancel the chat message
                return;
            }

            const tags = player.getTags(); // Get the player's tags
            const rank =
                tags
                    .find((tag) => tag.startsWith("Rank:")) // Find the first tag that starts with 'Rank:'
                    ?.replace("Rank:", "") // Remove 'Rank:' from the tag string
                    ?.replaceAll("--", "§r§4][§6") || "Member"; // Replace '--' with '§r§4][§6' in the tag string, or use 'Member' as default
            const formattedMessage = `§4[§6${rank}§4] §7${player.name}: §r${message}`; // Construct the formatted chat message
            if (!msg.cancel) {
                sendMsg("@a", formattedMessage); // Send the formatted chat message to all players
                msg.cancel = true; // Cancel the chat message
            }
        } else if (!msg.cancel) {
            sendMsg("@a", `${player.name}: ${message}`); // Send the chat message to all players
            msg.cancel = true; // Cancel the chat message
        }
    });
};

export { ChatFilter };
