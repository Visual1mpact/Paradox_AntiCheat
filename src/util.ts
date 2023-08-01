import { GameMode, Player, PlayerLeaveAfterEvent, Vector, world } from "@minecraft/server";
import config from "./data/config.js";
import { kickablePlayers } from "./kickcheck.js";

const overworld = world.getDimension("overworld");
const timerMap = new Map<string, number>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    timerMap.delete(playerName);
}
world.afterEvents.playerLeave.subscribe(onPlayerLogout);

/**
 * Flag players who trigger certain checks or sub-checks, with information about the type of hack, the item involved, and any debug information available.
 *
 * @name flag
 * @param {Player} player - The player object
 * @param {string} check - What check ran the function.
 * @param {string} checkType - What sub-check ran the function (ex. a, b ,c).
 * @param {string} hackType - What the hack is considered as (ex. movement, combat, exploit).
 * @param {string} item - Item object.
 * @param {number} stack - Item object stack.
 * @param {string} debugName - Name for the debug value.
 * @param {string} debug - Debug info.
 * @param {boolean} shouldTP - Whever to tp the player to itself.
 */
export async function flag(player: Player, check: string, checkType: string, hackType: string, item: string, stack: number, debugName: string, debug: string, shouldTP: boolean) {
    if (shouldTP && check !== "Crasher") {
        player.teleport(new Vector(player.location.x, player.location.y, player.location.z), { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
    } else if (shouldTP && check === "Crasher") {
        player.teleport({ x: 30000000, y: 30000000, z: 30000000 }, { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
    }

    setScore(player, `${check.toLowerCase()}vl`, 1, true);

    if (debug) {
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${debugName}=${debug})§4. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
    } else if (item && stack) {
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType} §7(${item.replace("minecraft:", "")}=${stack})§4. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
    } else {
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.name} §6has failed §7(${hackType}) §4${check}/${checkType}. VL= ${getScore(check.toLowerCase() + "vl", player)}`);
    }

    if (check === "Namespoof") {
        player.runCommandAsync(`kick ${player.id} §r\n\n§4[§6Paradox§4]§r You have illegal characters in your name!`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    }
}

/**
 * This function sends a kick message to a banned player, including the banning moderator and reason. If ban appeals are enabled, a Discord link will also be included in the message. If the player cannot be kicked, they will be despawned instantly.
 *
 * @name banMessage
 * @param {Player} player - The player object
 */
export async function banMessage(player: Player) {
    const tags = player.getTags();

    let reason: string;
    let by: string;

    for (const tag of tags) {
        if (tag.startsWith("By:")) {
            by = tag.slice(3);
        } else if (tag.startsWith("Reason:")) {
            reason = tag.slice(7);
        }
    }

    if (config.modules.banAppeal.enabled === true) {
        player.runCommandAsync(`kick ${player.id} §r\n§l§cYOU ARE BANNED!\n§r§eBanned By:§r ${by || "N/A"}\n§bReason:§r ${reason || "N/A"}\n${config.modules.banAppeal.discordLink}`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    } else {
        player.runCommandAsync(`kick ${player.id} §r\n§l§cYOU ARE BANNED!\n§r\n§eBanned By:§r ${by || "N/A"}\n§bReason:§r ${reason || "N/A"}`).catch(() => {
            // If we can't kick them with /kick, then we instantly despawn them
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        });
    }
}

/**
 * Returns the score of a player in the specified scoreboard objective.
 *
 * @name getScore
 * @param {string} objective - Scoreboard objective
 * @param {Player} player - The player object
 */
export function getScore(objective: string, player: Player) {
    try {
        return world.scoreboard.getObjective(objective).getScore(player.scoreboardIdentity);
    } catch (error) {
        return 0;
    }
}

/**
 * Sets a players score.
 *
 * @name setScore
 * @param {Player} target The player object.
 * @param {string} objective Scoreboard objective.
 * @param {number} amount The number to set it to.
 * @param {boolean} stack If true, it will be added instead of set. Default false.
 * @returns {number} The score it was set to.
 */
export function setScore(target: Player, objective: string, amount: number, stack: boolean = false): number {
    const scoreObj = world.scoreboard.getObjective(objective);
    if (scoreObj) {
        const isParticipant = !!scoreObj.getParticipants().some((target) => target.id === target.id);
        if (!isParticipant) {
            target.runCommand(`scoreboard players add @s ${objective} 0`);
        }
        let score = isParticipant ? scoreObj.getScore(target.scoreboardIdentity) : 0;
        const result = stack ? score + amount : amount;
        scoreObj.setScore(target.scoreboardIdentity, result);
        return result;
    } else {
        return 0;
    }
}

/**
 * Gets the prefix tag of a player, if it exists.
 *
 * @name getPrefix
 * @param {Player} player - The player object
 */
export function getPrefix(player: Player) {
    const tags = player.getTags();
    let customprefix = null;

    for (const tag of tags) {
        if (tag.startsWith("Prefix:")) {
            customprefix = tag.replace("Prefix:", "");
            break;
        }
    }

    config.customcommands.prefix = customprefix || config.customcommands.prefix;
    return config.customcommands.prefix;
}

/**
 * Resets the rank tag of a player by removing any tags starting with "Rank:".
 *
 * @name resetTag
 * @param {Player} member - The other player object
 */
export function resetTag(member: Player) {
    const sanitize = member.getTags();
    for (const tag of sanitize) {
        if (tag.startsWith("Rank:")) {
            member.removeTag(tag);
        }
    }
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${member.name} has reset their rank`);
}

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 *
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
export const UUID = (() => {
    const lut: string[] = [];
    for (let i = 0; i < 256; i++) {
        lut[i] = (i < 16 ? "0" : "") + i.toString(16);
    }

    return {
        generate: () => {
            const d0 = (Math.random() * 0x100000000) >>> 0;
            const d1 = (Math.random() * 0x100000000) >>> 0;
            const d2 = (Math.random() * 0x100000000) >>> 0;
            const d3 = (Math.random() * 0x100000000) >>> 0;
            return (
                lut[d0 & 0xff] +
                lut[(d0 >> 8) & 0xff] +
                lut[(d0 >> 16) & 0xff] +
                lut[(d0 >> 24) & 0xff] +
                "-" +
                lut[d1 & 0xff] +
                lut[(d1 >> 8) & 0xff] +
                "-" +
                lut[((d1 >> 16) & 0x0f) | 0x40] +
                lut[(d1 >> 24) & 0xff] +
                "-" +
                lut[(d2 & 0x3f) | 0x80] +
                lut[(d2 >> 8) & 0xff] +
                "-" +
                lut[(d2 >> 16) & 0xff] +
                lut[(d2 >> 24) & 0xff] +
                lut[d3 & 0xff] +
                lut[(d3 >> 8) & 0xff] +
                lut[(d3 >> 16) & 0xff] +
                lut[(d3 >> 24) & 0xff]
            );
        },
    };
})();

/**
 * Validates whether a given string is a valid UUID.
 *
 * @param {string} uuid - The string to validate as a UUID.
 * @returns {boolean} - Returns true if the string is a valid UUID, false otherwise.
 */
export function isValidUUID(uuid: string): boolean {
    // Regular expression to match the UUID pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Test if the UUID matches the pattern and return the result
    return uuidRegex.test(uuid);
}

/**
 * Takes a string and converts it to camelCase.
 *
 * @name toCamelCase
 * @param {string} str - Takes strings and converts to camelCase
 */
export function toCamelCase(str: string) {
    const regExp = /[^a-zA-Z0-9]+(.)/gi;
    return str.replace(regExp, (match) => {
        return match[1].toUpperCase();
    });
}

/**
 * Takes a string and converts it to PascalCase.
 *
 * @name toCamelCase
 * @param {string} str - Takes strings and converts to PascalCase
 */
export function toPascalCase(str: string) {
    const camelCase = toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Converts a string in snake_case format to Title Case format.
 *
 * @name titleCase
 * @param {*} s - Takes snakeCase and converts it to Title Case
 * @returns
 */
export const titleCase = (s: string) => s.replace(/^[-_]*(.)/, (_, c) => c.toUpperCase()).replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());

/**
 * Hashes a given string with the specified salt value using an algorithm.
 *
 * @name crypto
 * @param {string} salt - Hashes information
 * @param {string} text - String to be hashed
 */
export const crypto = (salt: string | number | boolean, text: string) => {
    const textToChars = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));
    const byteHex = (n: number) => ("0" + n.toString(16)).substring(-2);
    const applySaltToChar = (code: Uint8Array) => {
        const saltChars = textToChars(String(salt));
        let result = 0;
        for (let i = 0; i < code.length; i++) {
            result ^= saltChars[i % saltChars.length] ^ code[i];
        }
        return result;
    };

    const textChars = textToChars(text);
    const resultChars = new Uint8Array(textChars.length);
    for (let i = 0; i < textChars.length; i++) {
        resultChars[i] = applySaltToChar(textChars.slice(i, i + 1));
    }

    const joinedResult = [...resultChars].map(byteHex).join("");
    // Ensure it is no more than 50 characters as set for dynamic property strings
    return joinedResult.substring(0, 50);
};

/**
 * Encrypts a string using an algorithm.
 *
 * @name encryptString
 * @param {string} str - The string to encrypt
 * @param {string} salt - The salt to use for encryption
 * @returns {string} The encrypted string
 */
export function encryptString(str: string, salt: string): string {
    let ciphertext = "";
    let keyIndex = 0;
    for (let i = 0; i < str.length; i++) {
        const plainCharCode = str.charCodeAt(i);
        const keyCharCode = salt.charCodeAt(keyIndex % salt.length);
        const cipherCharCode = (plainCharCode + keyCharCode) % 256; // wrap around at 256
        ciphertext += String.fromCharCode(cipherCharCode);
        keyIndex++;
    }
    return "6f78" + ciphertext;
}

/**
 * Decrypts a string using an algorithm.
 *
 * @name decryptString
 * @param {string} str - The string to decrypt
 * @param {string} salt - The salt to use for decryption
 * @returns {string} The decrypted string
 */
export function decryptString(str: string, salt: string): string {
    let plaintext = "";
    let keyIndex = 0;
    str = str.slice(4);
    for (let i = 0; i < str.length; i++) {
        const cipherCharCode = str.charCodeAt(i);
        const keyCharCode = salt.charCodeAt(keyIndex % salt.length);
        const plainCharCode = (cipherCharCode - keyCharCode + 256) % 256; // wrap around at 256
        plaintext += String.fromCharCode(plainCharCode);
        keyIndex++;
    }
    return plaintext;
}

/**
 * Sets a timer for a given player.
 *
 * @param player - A string representing the player for whom the timer is being set.
 * @param spawn - An optional boolean parameter with a default value of `false`.
 * If `spawn` is set to `true`, the timer will be set for 10 seconds;
 * otherwise, it will be set for 2 seconds.
 */
export function setTimer(player: string, spawn: boolean = false) {
    let timer: number = 0;
    if (spawn === true) {
        // Set a timer for 10 seconds
        timer = Date.now() + 10000;
    } else {
        // Set a timer for 2 seconds
        timer = Date.now() + 2000;
    }

    // Store the timer in the map
    timerMap.set(player, timer);
}

/**
 * Checks if the timer for the specified player has expired.
 *
 * @param player - A string representing the player whose timer will be checked.
 * @returns A boolean value indicating whether the timer has expired (`true`) or not (`false`).
 */
export function isTimerExpired(player: string) {
    // Get the timer for the player
    const timer = timerMap.get(player);

    // If the timer doesn't exist, assume it's expired
    if (!timer) {
        return true;
    }

    // Check if the timer has expired
    if (Date.now() > timer) {
        timerMap.delete(player);
        return true;
    }

    return false;
}

/**
 * Get the gamemode of a given player
 * @param player - The player to get the gamemode of
 * @returns The gamemode of the player as a string, or undefined if the player is not found
 */
export function getGamemode(player: Player): string | undefined {
    // Loop through each gamemode in the GameMode enum
    for (const gameMode of Object.values(GameMode)) {
        // Use world.getPlayers() to get an iterator of all players in the world with the same name and game mode as the given player
        const gameModePlayer = world.getPlayers({ name: player.name, gameMode });
        // If a player is found with the given name and game mode, return the corresponding string representation of the gamemode
        if (gameModePlayer.length > 0) {
            switch (gameMode) {
                case GameMode.creative:
                    return "creative";
                case GameMode.survival:
                    return "survival";
                case GameMode.adventure:
                    return "adventure";
                case GameMode.spectator:
                    return "spectator";
            }
        }
    }
    // If no matching player is found, return undefined
    return undefined;
}

/**
 * Sends a message to a target in Minecraft.
 *
 * @param target The target to send the message to. This can be a player's username, a selector, or a JSON string.
 * @param message The message to send. This can be a string or an array of strings.
 */
export const sendMsg = async (target: string, message: string | string[]) => {
    const isArray = Array.isArray(message);

    // Check if target is equal to "@a"
    const modifiedMessage = target === "@a" ? message : "\n" + (isArray ? (message as string[]).map((msg) => msg.replace(/§r/g, "§r§o")).join("\n") : (message as string).replace(/§r/g, "§r§o"));

    overworld.runCommandAsync(`tellraw ${/^ *@[spear]( *\[.*\] *)?$|^ *("[^"]+"|\S+) *$/.test(target) ? target : JSON.stringify(target)} {"rawtext":[{"text":${JSON.stringify(modifiedMessage)}}]}`);
};

/**
 * Sends a message to a player in Minecraft.
 *
 * @param target The player to send the message to.
 * @param message The message to send. This can be a string or an array of strings.
 */
export const sendMsgToPlayer = async (target: Player, message: string | string[]) => {
    const isArray = Array.isArray(message);

    let modifiedMessage: string | string[];

    if (isArray) {
        modifiedMessage = (message as string[]).map((msg) => msg.replace(/§r/g, "§r§o")).join("\n");
    } else {
        modifiedMessage = (message as string).replace(/§r/g, "§r§o");
    }

    target.runCommandAsync(`tellraw @s {"rawtext":[{"text":${JSON.stringify("\n" + modifiedMessage)}}]}`);
};

export const allscores: string[] = [
    "autoclickervl",
    "badpacketsvl",
    "killauravl",
    "flyvl",
    "illegalitemsvl",
    "cbevl",
    "gamemodevl",
    "spammervl",
    "namespoofvl",
    "noslowvl",
    "crashervl",
    "reachvl",
    "invalidsprintvl",
    "armorvl",
    "antikbvl",
    "antifallvl",
    "nukervl",
    "scaffoldvl",
];
