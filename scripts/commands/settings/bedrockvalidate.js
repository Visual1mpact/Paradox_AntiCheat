import { disabler, getScore } from "../../util.js";

/**
 * @name bedrockvalidate
 * @param {object} message - Message object
 */
export function bedrockvalidate(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/bedrockValidate.js:7)");
    }

    message.cancel = true;

    let bedrockscore = getScore("bedrock", player);

    if (bedrockscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config bedrock 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6BedrockValidate!"}]}`);
    } else if (bedrockscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config bedrock 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4BedrockValidate!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a bedrock = paradox:config bedrock`);
}
