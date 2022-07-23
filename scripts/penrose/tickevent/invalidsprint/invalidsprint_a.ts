import {
  world,
  MinecraftEffectTypes,
  EntityMovementComponent,
} from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import {
  clearTickInterval,
  setTickInterval,
} from "../../../misc/scheduling.js";
import config from "../../../data/config.js";

const World = world;

function invalidsprinta(id) {
  // Get Dynamic Property
  let invalidSprintABoolean = World.getDynamicProperty("invalidsprinta_b");
  if (invalidSprintABoolean === undefined) {
    invalidSprintABoolean = config.modules.invalidsprintA.enabled;
  }
  // Unsubscribe if disabled in-game
  if (invalidSprintABoolean === false) {
    clearTickInterval(id);
    return;
  }
  // run as each player
  for (let player of World.getPlayers()) {
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode;
    try {
      encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    if (hash !== undefined && encode === hash) {
      continue;
    }
    const speedcheck = player.getComponent(
      "minecraft:movement"
    ) as EntityMovementComponent;
    // Check the players current speed and see if it is equal or more than the value we have hardcoded
    // If they do have the effect for blindness and they are sprinting then we flag and reset their speed.
    if (
      speedcheck.current >= config.modules.invalidsprintA.speed &&
      player.getEffect(MinecraftEffectTypes.blindness)
    ) {
      let speedrecord = speedcheck.current;
      flag(
        player,
        "InvalidSprint",
        "A",
        "Movement",
        null,
        null,
        "BlindSprint",
        speedrecord.toFixed(3),
        true,
        null
      );
      speedcheck.setCurrent(speedcheck.value);
    }
  }
  return;
}

const InvalidSprintA = () => {
  // Executes every 2 seconds
  const id = setTickInterval(() => invalidsprinta(id), 40);
};

export { InvalidSprintA };
