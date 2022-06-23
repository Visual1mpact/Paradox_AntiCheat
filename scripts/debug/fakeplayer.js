import { BlockLocation, MinecraftBlockTypes } from "mojang-minecraft"
import * as gt from 'mojang-gametest'
import config from "../data/config.js"

const fakePlayerCount = 3 // number of fake players to be spawned
const fakePlayerName = 'Dummy' // fake player name, only used if spawn count is 1 or less

// Command: `/gametest run paradox:spawnfakeplayer`
// Place a block in where the fake players spawned to stop the test.
if (config.debug) gt.register("paradox", "spawnFakePlayer", (test) => {
    const spawnLoc = new BlockLocation(1, 2, 1)
    if (fakePlayerCount > 1) for (let i = 0; i < fakePlayerCount; i++) test.spawnSimulatedPlayer(spawnLoc, `Dummy${i+1}`);
    else test.spawnSimulatedPlayer(spawnLoc, fakePlayerName)

    test.succeedWhen(() => test.assertBlockPresent(MinecraftBlockTypes.air, spawnLoc, false))
    test.succeedOnTick(2147483627)
})
    .maxTicks(2147483647)
    .structureName("ComponentTests:platform")