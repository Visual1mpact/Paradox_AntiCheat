/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function statsHelp(player: Player, prefix: string) {
  let commandStatus: string;
  if (!config.customcommands.stats) {
    commandStatus = "§6[§4DISABLED§6]§r";
  } else {
    commandStatus = "§6[§aENABLED§6]§r";
  }
  return sendMsgToPlayer(player, [
    `\n§4[§6Command§4]§r: stats`,
    `§4[§6Status§4]§r: ${commandStatus}`,
    `§4[§6Usage§4]§r: stats [optional]`,
    `§4[§6Optional§4]§r: username, help`,
    `§4[§6Description§4]§r: Shows logs from the specified user.`,
    `§4[§6Examples§4]§r:`,
    `    ${prefix}stats ${player.name}`,
    `    ${prefix}stats help`,
  ]);
}

/**
 * @name stats
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function stats(message: BeforeChatEvent, args: string[]) {
  // validate that required params are defined
  if (!message) {
    return console.warn(
      `${new Date()} | ` +
        "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/stats.js:29)"
    );
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
    return sendMsgToPlayer(
      player,
      `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`
    );
  }

  // Check for custom prefix
  let prefix = getPrefix(player);

  // Are there arguements
  if (!args.length) {
    return statsHelp(player, prefix);
  }

  // Was help requested
  let argCheck = args[0];
  if (
    (argCheck && args[0].toLowerCase() === "help") ||
    !config.customcommands.stats
  ) {
    return statsHelp(player, prefix);
  }

  if (!player.hasTag("notify")) {
    return sendMsgToPlayer(
      player,
      `§r§4[§6Paradox§4]§r You need to enable cheat notifications.`
    );
  }

  // try to find the player requested
  let member: Player;
  for (let pl of World.getPlayers()) {
    if (
      pl.nameTag
        .toLowerCase()
        .includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))
    ) {
      member = pl;
    }
  }

  if (!member) {
    return sendMsgToPlayer(
      player,
      `§r§4[§6Paradox§4]§r Couldnt find that player!`
    );
  }

  return member.runCommand(`execute @s ~~~ function tools/stats`);
}
