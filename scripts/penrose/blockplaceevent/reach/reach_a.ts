import {
  world,
  BlockLocation,
  MinecraftBlockTypes,
  BlockPlaceEvent,
} from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";
// import { flag } from "../../../util.js";

const World = world;

function reacha(object: BlockPlaceEvent) {
  // Get Dynamic Property
  let reachABoolean = World.getDynamicProperty("reacha_b");
  if (reachABoolean === undefined) {
    reachABoolean = config.modules.reachA.enabled;
  }
  // Unsubscribe if disabled in-game
  if (reachABoolean === false) {
    World.events.blockPlace.unsubscribe(reacha);
    return;
  }

  // Properties from class
  let { block, player, dimension } = object;

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

  // Block coordinates
  let { x, y, z } = block.location;
  // Player coordinates
  let { x: x1, y: y1, z: z1 } = player.location;

  // Calculate the distance between the player and the block being placed
  let reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);

  if (reach > config.modules.reachA.reach) {
    dimension
      .getBlock(new BlockLocation(x, y, z))
      .setType(MinecraftBlockTypes.air);
    // flag(player, "Reach", "A", "Placement", false, false "reach", reach.toFixed(3), false, false);
  }
}

const ReachA = () => {
  World.events.blockPlace.subscribe(reacha);
};

export { ReachA };
