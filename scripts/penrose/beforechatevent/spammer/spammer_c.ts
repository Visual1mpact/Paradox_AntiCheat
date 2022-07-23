import { BeforeChatEvent, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerc(msg: BeforeChatEvent) {
  // Get Dynamic Property
  let spammerCBoolean = World.getDynamicProperty("spammerc_b");
  if (spammerCBoolean === undefined) {
    spammerCBoolean = config.modules.spammerC.enabled;
  }
  // Unsubscribe if disabled in-game
  if (spammerCBoolean === false) {
    World.events.beforeChat.unsubscribe(spammerc);
    return;
  }
  const player = msg.sender;

  // Check for hash/salt and validate password
  let hash = player.getDynamicProperty("hash");
  let salt = player.getDynamicProperty("salt");
  let encode;
  try {
    encode = crypto(salt, config.modules.encryption.password);
  } catch (error) {}
  // Return if player has op
  if (hash !== undefined && encode === hash) {
    return;
  }

  // Spammer/C = checks if someone sends a message while using an item
  if (player.hasTag("right")) {
    flag(player, "Spammer", "C", "Misc", null, null, null, null, false, msg);
  }
}

const SpammerC = () => {
  World.events.beforeChat.subscribe(spammerc);
};

export { SpammerC };
