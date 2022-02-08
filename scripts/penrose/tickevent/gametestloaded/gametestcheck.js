import * as Minecraft from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

let loaded = false;

const GametestCheck = () => {
    setTickInterval(() => {
        // Credits go out to mrpatches123#0348 for giving guidance to use tick events
        // to check when loaded in the world and to execute code afterwards
        try {
            if (!loaded) {
                const players = World.getPlayers().map(player => player.nameTag);
                World.getDimension("overworld").runCommand(`testfor @a[name="${players[0]}"]`);
                try {
                    // (1..) gametest already enabled so set loaded to true and do nothing
                    World.getDimension("overworld").runCommand(`testfor @a[scores={gametestapi=1..}]`);
                    loaded = true;
                } catch {
                    // (..0) gametest needs to be enabled (1..) then set loaded to true
                    World.getDimension("overworld").runCommand(`testfor @a[scores={gametestapi=..0}]`);
                    World.getDimension("overworld").runCommand(`execute "${players[0]}" ~~~ function checks/gametestapi`);
                    loaded = true;
                    return;
                }
            }
        } catch (error) {}
    }, 40) //Executes every 2 seconds
}

export { GametestCheck }