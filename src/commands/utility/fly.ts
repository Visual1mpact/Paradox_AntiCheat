import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function flyHelp(player: Player, prefix: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.fly) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: fly`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: fly [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Will grant player the ability to fly.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}fly ${player.name}`,
        `        §4- §6Grant the ability to fly to ${player.name}§f`,
        `    ${prefix}fly help`,
        `        §4- §6Show command help§f`,
    ]);
}

function mayflydisable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled fly mode for ${player === member ? "themselves" : "§7" + member.name}.`);
}

function mayflyenable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled fly mode for ${player === member ? "themselves" : "§7" + member.name}.`);
}

/**
 * @name fly
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - (Optional) Additional arguments provided (optional).
 */
export function fly(message: ChatSendAfterEvent, args: string[]) {
    handleFly(message, args).catch((error) => {
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

async function handleFly(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:38)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player!`);
    }

    const membertag = member.getTags();

    if (!membertag.includes("noflying") && !membertag.includes("flying")) {
        member
            .runCommandAsync(`ability @s mayfly true`)
            .then(() => {
                member.addTag("flying");
                mayflyenable(player, member);
            })
            .catch(() => {
                return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f§4[Fly]§f Education Edition is disabled in this world.`);
            });
        return;
    }

    if (membertag.includes("flying")) {
        member.addTag("noflying");
    }

    if (member.hasTag("noflying")) {
        member
            .runCommandAsync(`ability @s mayfly false`)
            .then(() => {
                member.removeTag("flying");
                mayflydisable(player, member);
                member.removeTag("noflying");
            })
            .catch(() => {
                return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f§4[Fly]§f Education Edition is disabled in this world.`);
            });
        return;
    }
}
