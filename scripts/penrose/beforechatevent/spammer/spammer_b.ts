import { BeforeChatEvent, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function spammerb(msg: BeforeChatEvent) {
  // Get Dynamic Property
  let spammerBBoolean = World.getDynamicProperty("spammerb_b");
  if (spammerBBoolean === undefined) {
    spammerBBoolean = config.modules.spammerB.enabled;
  }
  // Unsubscribe if disabled in-game
  if (spammerBBoolean === false) {
    World.events.beforeChat.unsubscribe(spammerb);
    return;
  }
  const player = msg.sender;

  // Check for hash/salt and validate password
  let hash = player.getDynamicProperty("hash");
  let salt = player.getDynamicProperty("salt");
  let encode: string;
  try {
    encode = crypto(salt, config.modules.encryption.password);
  } catch (error) {}
  // Return if player has op
  if (hash !== undefined && encode === hash) {
    return;
  }

  // Spammer/B = checks if someone sends a message while swinging their hand
  if (player.hasTag("left")) {
    flag(player, "Spammer", "B", "Combat", null, null, null, null, false, msg);
  }
}

const SpammerB = () => {
  World.events.beforeChat.subscribe(spammerb);
};

export { SpammerB };
