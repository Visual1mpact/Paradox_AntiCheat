import {
  BlockLocation,
  ItemStack,
  MinecraftBlockTypes,
  MinecraftItemTypes,
  world,
} from "mojang-minecraft";
import * as gt from "mojang-gametest";
import config from "../data/config.js";

const fakePlayerCount = 3; // number of fake players to be spawned
const fakePlayerName = "Dummy"; // fake player name, only used if spawn count is 1 or less

// Command: `/gametest run paradox:spawnfakeplayer`
// Place a block in where the fake players spawned to stop the test.
if (config.debug)
  gt.register("paradox", "spawnFakePlayer", (test) => {
    const spawnLoc = new BlockLocation(1, 2, 1);
    if (fakePlayerCount > 1)
      for (let i = 0; i < fakePlayerCount; i++)
        test.spawnSimulatedPlayer(spawnLoc, `Dummy${i + 1}`);
    else test.spawnSimulatedPlayer(spawnLoc, fakePlayerName);

    test.succeedWhen(() =>
      test.assertBlockPresent(MinecraftBlockTypes.air, spawnLoc, false)
    );
    test.succeedOnTick(2147483627);
  })
    .maxTicks(2147483647)
    .structureName("ComponentTests:platform");

if (config.debug)
  gt.register("paradox", "stresstest", (test) => {
    const dirt = new ItemStack(MinecraftItemTypes.dirt, 64);

    const spawnLoc = new BlockLocation(1, 2, 1);
    for (let i = 0; i < 40; i++) {
      const plr = test.spawnSimulatedPlayer(
        spawnLoc,
        `Dummy${i}-${(
          100000000000 + Math.floor(Math.random() * 900000000000)
        ).toString(36)}`
      );
      //@ts-expect-error
      const c = plr.getComponent("inventory").container;
      for (let i = 0, m = c.size; i < m; i++) c.setItem(i, dirt);
    }

    let c = 0;
    const aa = world.events.tick.subscribe(({ deltaTime }) => (c += deltaTime));

    const duration = 40;

    test
      .startSequence()
      .thenIdle(duration)
      .thenExecute(() => {
        world.events.tick.unsubscribe(aa);
        try {
          world
            .getDimension("overworld")
            .runCommand(
              `tellraw @a {"rawtext":[{"text":"${(duration / c).toFixed(
                2
              )} tps"}]}`
            );
        } catch (e) {
          console.warn(e);
        }
      })
      .thenSucceed();
  })
    .maxTicks(2147483647)
    .structureName("ComponentTests:platform");
