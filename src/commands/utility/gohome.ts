import { world, Location, Player, BeforeChatEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

let cooldownTimer = new WeakMap();

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
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: gohome`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: gohome [optional]`,
        `§4[§6Optional§4]§r: name, help`,
        `§4[§6Description§4]§r: Return home to a specified saved location.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}gohome barn`,
        `    ${prefix}gohome help`,
    ]);
}

/**
 * @name gohome
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function gohome(message: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:52)");
    }

    message.cancel = true;

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return goHomeHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.gohome) {
        return goHomeHelp(player, prefix);
    }

    // Don't allow spaces
    if (args.length > 1) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No spaces in names please!`);
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    let homex: number;
    let homey: number;
    let homez: number;
    let dimension: string;
    let coordinatesArray: string[];
    const tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            // Split string into array
            coordinatesArray = tags[i].split(" ");
            break;
        }
    }

    for (let i = 0; i < coordinatesArray.length; i++) {
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
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Home '${args[0]}' does not exist!`);
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
            await player.runCommandAsync(`scoreboard players set @s teleport 25`);
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Welcome back!`);
            player.teleport(new Location(homex, homey, homez), World.getDimension(dimension), 0, 0);
            // Delete old key and value
            cooldownTimer.delete(player);
            // Create new key and value with current time in milliseconds
            cooldownTimer.set(player, new Date().getTime());
        } else {
            // Teleporting to fast
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Too fast! Please wait for ${activeTimer} before going home.`);
        }
    }
}
