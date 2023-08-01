import { world } from "@minecraft/server";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import config from "../../../data/config.js";

// Function to generate a random obfuscated string of variable length
function obfuscateString() {
    const obfuscatedChars = ["*", "#", "&", "%", "$", "@", "!"]; // Define the characters to use for obfuscation
    const maxLength = 10; // Define the maximum length of the obfuscated string
    const length = Math.floor(Math.random() * maxLength) + 1; // Generate a random length between 1 and maxLength
    const obfuscatedStr = Array.from({ length }, () => {
        const randomIndex = Math.floor(Math.random() * obfuscatedChars.length); // Generate a random index
        return obfuscatedChars[randomIndex]; // Get a random character from the obfuscatedChars array
    });

    return obfuscatedStr.join(""); // Join the array of characters into a string
}

// Chat filter function
const ChatFilter = () => {
    // Subscribe to the 'beforeChat' event
    world.beforeEvents.chatSend.subscribe((msg) => {
        let { message, sender: player } = msg; // Destructure 'message' and 'sender' properties from the 'msg' object

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
            let formattedMessage = `§4[§6${rank}§4] §7${player.name}: §r${message}`; // Construct the formatted chat message

            // Obfuscate the password in the message
            const password = config.modules.encryption.password;
            if (password.length > 0) {
                const obfuscatedPassword = obfuscateString();
                formattedMessage = formattedMessage.replace(password, obfuscatedPassword);
            }

            if (!msg.sendToTargets) {
                sendMsg("@a", formattedMessage); // Send the formatted chat message to all players
                msg.sendToTargets = true; // Cancel the chat message
            }
        } else {
            // Obfuscate the password in the message
            const password = config.modules.encryption.password;
            if (password.length > 0) {
                const obfuscatedPassword = obfuscateString();
                msg.message = message.replace(password, obfuscatedPassword);
            }
        }
    });
};

export { ChatFilter };
