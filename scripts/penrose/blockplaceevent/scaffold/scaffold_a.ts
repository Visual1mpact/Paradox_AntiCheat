import {
  world,
  BlockLocation,
  MinecraftBlockTypes,
  BlockPlaceEvent,
} from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto, flag } from "../../../util.js";

const World = world;

let blockTimer = new Map();

function scaffolda(object: BlockPlaceEvent) {
  // Get Dynamic Property
  let antiScaffoldABoolean = World.getDynamicProperty("antiscaffolda_b");
  if (antiScaffoldABoolean === undefined) {
    antiScaffoldABoolean = config.modules.antiscaffoldA.enabled;
  }
  // Unsubscribe if disabled in-game
  if (antiScaffoldABoolean === false) {
    World.events.blockPlace.unsubscribe(scaffolda);
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

  let timer: Date[];
  if (blockTimer.has(player.nameTag)) {
    timer = blockTimer.get(player.nameTag);
  } else {
    timer = [];
  }

  timer.push(new Date());

  let tiktok = timer.filter(
    (time) => time.getTime() > new Date().getTime() - 100
  );
  blockTimer.set(player.nameTag, tiktok);

  if (tiktok.length >= config.modules.antiscaffoldA.max) {
    dimension
      .getBlock(new BlockLocation(x, y, z))
      .setType(MinecraftBlockTypes.air);
    flag(
      player,
      "Scaffold",
      "A",
      "Placement",
      null,
      null,
      null,
      null,
      false,
      null
    );
    /* let tags = player.getTags();

        // This removes old ban tags
        tags.forEach(t => {
            if(t.startsWith("Reason:")) {
                player.removeTag(t);
            }
            if(t.startsWith("By:")) {
                player.removeTag(t);
            }
        });
        try {
            player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Scaffolding"`);
            player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            player.triggerEvent('paradox:kick');
        }*/
  }
}

const ScaffoldA = () => {
  World.events.blockPlace.subscribe(scaffolda);
};

export { ScaffoldA };
