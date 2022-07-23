import {
  world,
  MinecraftEffectTypes,
  EntityMovementComponent,
} from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import {
  clearTickInterval,
  setTickInterval,
} from "../../../misc/scheduling.js";

const World = world;

function noslowa(id: number) {
  // Get Dynamic Property
  let noSlowBoolean = World.getDynamicProperty("noslowa_b");
  if (noSlowBoolean === undefined) {
    noSlowBoolean = config.modules.noslowA.enabled;
  }
  // Unsubscribe if disabled in-game
  if (noSlowBoolean === false) {
    clearTickInterval(id);
    return;
  }
  // run as each player
  for (let player of World.getPlayers()) {
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
    const speedcheck = player.getComponent(
      "minecraft:movement"
    ) as EntityMovementComponent;
    // Check the players current speed and see if it exceeds the value we have hardcoded
    // If they do not have the effect for speed then we flag and reset their speed to the default value.
    if (
      speedcheck.current >= config.modules.noslowA.speed &&
      !player.getEffect(MinecraftEffectTypes.speed)
    ) {
      let speedrecord = speedcheck.current;
      flag(
        player,
        "NoSlow",
        "A",
        "Movement",
        null,
        null,
        "IllegalSpeed",
        speedrecord.toFixed(3),
        true,
        null
      );
      speedcheck.setCurrent(speedcheck.value);
    }
  }
  return;
}

const NoSlowA = () => {
  // Executes every 2 seconds
  const id = setTickInterval(() => noslowa(id), 40);
};

export { NoSlowA };
