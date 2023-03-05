import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import scoreboard from "../../libs/scoreboardnew.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

function dpwcleanupHelp(player: Player, prefix: string) {
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: dpwcleanup`,
        `§4[§6Usage§4]§r: dpwcleanup [optional]`,
        `§4[§6Optional§4]§r: id`,
        `§4[§6Description§4]§r: Cleanup leftover dynamic property wrapper data.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}dpwcleanup 3t6@XB`,
        `    ${prefix}dpwcleanup help`,
    ]);
}

/**
 * @name dpwcleanup
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function dpwcleanup(message: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/dpwcleanup.js:999999)");
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
        return dpwcleanupHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help") {
        return dpwcleanupHelp(player, prefix);
    }

    const dpwidRaw = args[0],
        dpwid = dpwidRaw === "3t6@XB" ? String(crypto(dpwidRaw, config.modules.encryption.password)).slice(0, 6) : dpwidRaw;

    if (!scoreboard.objective.exist(`${dpwid}:wld`)) {
        sendMsgToPlayer(player, `No data found on ID '${dpwid}'.`);
        return;
    }

    sendMsgToPlayer(player, `Cleanup started.`);

    // world cleanup
    const worldScore = scoreboard.objective.get(`${dpwid}:wld`).dummies;
    for (const [name] of worldScore.getScores()) {
        // parse the saved value
        const [match, id, type] = name.match(/(.*?)\|\|(string|number|boolean)\|\|/) ?? [];

        // skip if match is undefined (misformatted)
        if (typeof match == "undefined") continue;

        // parse value
        const valueStr = name.substring(match.length),
            value = type == "number" ? +valueStr : type == "boolean" ? valueStr == "true" : valueStr;

        try {
            world.setDynamicProperty(id, value);
        } catch (e) {
            sendMsgToPlayer(player, `ERROR setting property '${id}' to '${value}' (type: ${type}) to world: ${e}`);
        }

        await 0;
    }

    const plrRegScore = scoreboard.objective.get(`${dpwid}:uidreg`).players;
    for (const [, , id] of plrRegScore) {
        const plrScoreId = `${dpwid}:plr:${id.toString(36)}`;
        if (!scoreboard.objective.exist(plrScoreId)) {
            sendMsgToPlayer(player, `ERROR deleting player property data #${id} (${id.toString(36)}): not found`);
            continue;
        }
        scoreboard.objective.delete(plrScoreId);

        await 0;
    }

    scoreboard.objective.delete(`${dpwid}:wld`);
    scoreboard.objective.delete(`${dpwid}:uidreg`);

    sendMsgToPlayer(player, `Cleanup finished.`);
}
