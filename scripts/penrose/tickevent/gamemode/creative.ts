import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto, getScore, sendMsg } from "../../../util.js";

const World = world;

function creative() {
  // Get Dynamic Property
  let adventureGMBoolean = World.getDynamicProperty("adventuregm_b");
  if (adventureGMBoolean === undefined) {
    adventureGMBoolean = config.modules.adventureGM.enabled;
  }
  let creativeGMBoolean = World.getDynamicProperty("creativegm_b");
  if (creativeGMBoolean === undefined) {
    creativeGMBoolean = config.modules.creativeGM.enabled;
  }
  let survivalGMBoolean = World.getDynamicProperty("survivalgm_b");
  if (survivalGMBoolean === undefined) {
    survivalGMBoolean = config.modules.survivalGM.enabled;
  }
  // Unsubscribe if disabled in-game
  if (creativeGMBoolean === false) {
    World.events.tick.unsubscribe(creative);
    return;
  }
  let filter = new EntityQueryOptions();
  // 1 = creative
  filter.gameMode = 1;
  // Run as each player
  for (let player of World.getPlayers(filter)) {
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
      encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    if (hash !== undefined && encode === hash) {
      continue;
    }
    // Make sure they didn't enable all of them in config.js as this will have a negative impact
    if (survivalGMBoolean === true && adventureGMBoolean === true) {
      // Default to adventure for safety
      World.setDynamicProperty("adventuregm_b", false);
    }
    // Are they in creative? Fix it.
    if (survivalGMBoolean === true && adventureGMBoolean === false) {
      // Adventure is allowed so set them to adventure
      player.runCommand(`gamemode a`);
    }
    if (survivalGMBoolean === false && adventureGMBoolean === true) {
      // Survival is allowed so set them to survival
      player.runCommand(`gamemode s`);
    }
    // If both are allowed then default to survival
    if (survivalGMBoolean === false && adventureGMBoolean === false) {
      // Survival is allowed so set them to survival
      player.runCommand(`gamemode s`);
    }
    player.runCommand(`scoreboard players add @s gamemodevl 1`);
    sendMsg(
      "@a[tag=notify]",
      `§r§4[§6Paradox§4]§r ${
        player.nameTag
      } §6has tried to change their gamemode §7(Gamemode_C)§6.§4 VL= ${getScore(
        "gamemodevl",
        player
      )}`
    );
  }
}

const Creative = () => {
  World.events.tick.subscribe(creative);
};

export { Creative };
