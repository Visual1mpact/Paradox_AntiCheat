/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function flyHelp(player: Player, prefix: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.fly) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: fly`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: fly [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Will grant player the ability to fly.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}fly ${player.name}`,
        `    ${prefix}fly help`,
    ]);
}

function mayflydisable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled fly mode for ${player === member ? "themselves" : member.nameTag}.`);
}

function mayflyenable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled fly mode for ${player === member ? "themselves" : member.nameTag}.`);
}

/**
 * @name fly
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - (Optional) Additional arguments provided (optional).
 */
export async function fly(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:38)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return flyHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.fly) {
        return flyHelp(player, prefix);
    }

    // try to find the player requested
    let member: Player;
    if (args.length) {
        for (const pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    const membertag = member.getTags();

    if (!membertag.includes("noflying") && !membertag.includes("flying")) {
        try {
            await member.runCommandAsync(`ability @s mayfly true`);
            member.addTag("flying");
            mayflyenable(player, member);
        } catch (Error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }

    if (membertag.includes("flying")) {
        member.addTag("noflying");
    }

    if (member.hasTag("noflying")) {
        try {
            await member.runCommandAsync(`ability @s mayfly false`);
            member.removeTag("flying");
            mayflydisable(player, member);
            member.removeTag("noflying");
        } catch (error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }
}
