import { world, Player, ChatSendAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { decryptString, getPrefix, encryptString, sendMsgToPlayer, setTimer } from "../../util.js";

const cooldownTimer = new WeakMap();

function dhms(ms: number) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const daysms = ms % (24 * 60 * 60 * 1000);
    const hours = Math.floor(daysms / (60 * 60 * 1000));
    const hoursms = ms % (60 * 60 * 1000);
    const minutes = Math.floor(hoursms / (60 * 1000));
    const minutesms = ms % (60 * 1000);
    const sec = Math.floor(minutesms / 1000);
    if (days !== 0) {
        return days + " Days : " + hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (hours !== 0) {
        return hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (minutes !== 0) {
        return minutes + " Minutes : " + sec + " Seconds";
    }
    return sec + " Seconds";
}

function goHomeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.gohome) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: gohome`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: gohome [optional]`,
        `§4[§6Optional§4]§f: name, help`,
        `§4[§6Description§4]§f: Return home to a specified saved location.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}gohome barn`,
        `        §4- §6Return to the "barn" home§f`,
        `    ${prefix}gohome help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name gohome
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function gohome(message: ChatSendAfterEvent, args: string[]) {
    handleGoHome(message, args).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleGoHome(message: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:52)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Cache
    const length = args.length;

    // Are there arguements
    if (!length) {
        return goHomeHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.gohome) {
        return goHomeHelp(player, prefix);
    }

    // Don't allow spaces
    if (length > 1) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No spaces in names please!`);
    }

    // Hash the coordinates for security
    const salt = world.getDynamicProperty("crypt");

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    let homex: number;
    let homey: number;
    let homez: number;
    let dimension: string;
    let coordinatesArray: string[];
    const tags = player.getTags();
    const tagsLength = tags.length;
    for (let i = 0; i < tagsLength; i++) {
        if (tags[i].startsWith("1337")) {
            // Decode it so we can verify it
            tags[i] = decryptString(tags[i], salt as string);
        }
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            // Split string into array
            coordinatesArray = tags[i].split(" ");
            break;
        }
    }

    if (!coordinatesArray) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Home '${args[0]}' does not exist!`);
    }

    const coordArrayLength = coordinatesArray.length;
    for (let i = 0; i < coordArrayLength; i++) {
        // Get their location from the array
        if (coordinatesArray[i].includes("X:")) {
            homex = parseInt(coordinatesArray[i].replace("X:", ""));
        }
        if (coordinatesArray[i].includes("Y:")) {
            homey = parseInt(coordinatesArray[i].replace("Y:", ""));
        }
        if (coordinatesArray[i].includes("Z:")) {
            homez = parseInt(coordinatesArray[i].replace("Z:", ""));
        }
        if (coordinatesArray[i].includes("Dimension:")) {
            dimension = coordinatesArray[i].replace("Dimension:", "");
        }
    }

    if (!homex || !homey || !homez || !dimension) {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Home '${args[0]}' does not exist!`);
    } else {
        let cooldownCalc: number;
        let activeTimer: string;
        // Get original time in milliseconds
        const cooldownVerify = cooldownTimer.get(player);
        // Convert config settings to milliseconds so we can be sure the countdown is accurate
        const msSettings = config.modules.goHome.days * 24 * 60 * 60 * 1000 + config.modules.goHome.hours * 60 * 60 * 1000 + config.modules.goHome.minutes * 60 * 1000 + config.modules.goHome.seconds * 1000;
        if (cooldownVerify !== undefined) {
            // Determine difference between new and original times in milliseconds
            const bigBrain = new Date().getTime() - cooldownVerify;
            // Subtract realtime clock from countdown in configuration to get difference
            cooldownCalc = msSettings - bigBrain;
            // Convert difference to clock format D : H : M : S
            activeTimer = dhms(cooldownCalc);
        } else {
            // First time executed so we default to configuration in milliseconds
            cooldownCalc = msSettings;
        }
        // If timer doesn't exist or has expired then grant permission to teleport and set the countdown
        if (cooldownCalc === msSettings || cooldownCalc <= 0 || uniqueId === player.name) {
            // This timer is a grace period
            setTimer(player.id);
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Welcome back!`);
            player.teleport({ x: homex, y: homey, z: homez }, { dimension: world.getDimension(dimension), rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
            // Delete old key and value
            cooldownTimer.delete(player);
            // Create new key and value with current time in milliseconds
            cooldownTimer.set(player, new Date().getTime());
        } else {
            // Teleporting to fast
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Too fast! Please wait for ${activeTimer} before going home.`);
        }
    }
}
