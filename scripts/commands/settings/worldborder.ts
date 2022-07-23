import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { WorldBorder } from "../../penrose/tickevent/worldborder/worldborder.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function worldBorderHelp(player: Player, prefix: string, worldBorderBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.worldborder) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (worldBorderBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: worldborder`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: worldborder <value> [optional]`,
        `§4[§6Optional§4]§r: disable, help`,
        `§4[§6Description§4]§r: Sets the world border and restricts players to that border.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}worldborder 10000 5000`,
        `    ${prefix}worldborder -o 10000 -n 5000`,
        `    ${prefix}worldborder -overworld 10000 -nether 5000`,
        `    ${prefix}worldborder -overworld 10000`,
        `    ${prefix}worldborder -nether 5000`,
        `    ${prefix}worldborder disable`,
        `    ${prefix}worldborder help`,
    ]);
}

/**
 * @name worldborder
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function worldborders(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/worldborder.js:38)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let worldBorderBoolean = World.getDynamicProperty("worldborder_b");
    if (worldBorderBoolean === undefined) {
        worldBorderBoolean = config.modules.worldBorder.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Are there arguements?
    if (!args.length) {
        return worldBorderHelp(player, prefix, worldBorderBoolean);
    }

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.worldborder) {
        return worldBorderHelp(player, prefix, worldBorderBoolean);
    }

    // Shutdown worldborder
    if (argCheck === "disable") {
        // Disable Worldborder
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled the §6World Border§r!`);
        World.setDynamicProperty("worldborder_b", false);
        World.setDynamicProperty("worldborder_n", 0);
        World.setDynamicProperty("worldborder_nether_n", 0);
        return;
    }

    /**
     * args[0] = overworld
     * args[1] = overworld border size
     * args[2] = nether
     * args[3] = nether border size
     */
    if ((args[0] === "-overworld" || args[0] === "-o") && isNaN(Number(args[1])) === false && (args[2] === "-nether" || args[2] === "-n") && isNaN(Number(args[3])) === false) {
        // Build the wall
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set the §6World Border§r! Overworld: ${args[1]} Nether: ${args[3]}`);
        World.setDynamicProperty("worldborder_b", true);
        World.setDynamicProperty("worldborder_n", Math.abs(Number(args[1])));
        World.setDynamicProperty("worldborder_nether_n", Math.abs(Number(args[3])));
        WorldBorder();
        return;
    }

    /**
     * args[0] = nether
     * args[1] = nether border size
     * args[2] = overworld
     * args[3] = overworld border size
     */
    if ((args[0] === "-nether" || args[0] === "-n") && isNaN(Number(args[1])) === false && (args[2] === "-overworld" || args[2] === "-o") && isNaN(Number(args[3])) === false) {
        // Build the wall
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set the §6World Border§r! Overworld: ${args[3]} Nether: ${args[1]}`);
        World.setDynamicProperty("worldborder_b", true);
        World.setDynamicProperty("worldborder_n", Math.abs(Number(args[3])));
        World.setDynamicProperty("worldborder_nether_n", Math.abs(Number(args[1])));
        WorldBorder();
        return;
    }

    /**
     * args[0] = number (overworld border)
     * args[1] = number (nether border)
     */
    if (isNaN(Number(args[0])) === false && isNaN(Number(args[1])) === false) {
        // Build the wall
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set the §6World Border§r! Overworld: ${args[0]} Nether: ${args[1]}`);
        World.setDynamicProperty("worldborder_b", true);
        World.setDynamicProperty("worldborder_n", Math.abs(Number(args[0])));
        World.setDynamicProperty("worldborder_nether_n", Math.abs(Number(args[1])));
        WorldBorder();
        return;
    }

    /**
     * args[0] = nether
     * args[1] = nether border size
     */
    if ((args[0] === "-nether" || args[0] === "-n") && isNaN(Number(args[1])) === false) {
        // Build the wall
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set the §6World Border§r! Nether: ${args[1]}`);
        World.setDynamicProperty("worldborder_b", true);
        World.setDynamicProperty("worldborder_nether_n", Math.abs(Number(args[1])));
        WorldBorder();
        return;
    }

    /**
     * args[0] = overworld
     * args[1] = overworld border size
     */
    if ((args[0] === "-overworld" || args[0] === "-o") && isNaN(Number(args[1])) === false) {
        // Build the wall
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set the §6World Border§r! Overworld: ${args[1]}`);
        World.setDynamicProperty("worldborder_b", true);
        World.setDynamicProperty("worldborder_n", Math.abs(Number(args[1])));
        WorldBorder();
        return;
    }

    // Got nothing so bring up the help menu
    return worldBorderHelp(player, prefix, worldBorderBoolean);
}
