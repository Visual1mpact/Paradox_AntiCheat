import * as Minecraft from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

let loaded = false;

const GametestCheck = () => {
    setTickInterval(() => {
        // Credits go out to mrpatches123#0348 for giving guidance to use tick events
        // to check when loaded in the world and to execute code afterwards
        try {
            if (!loaded) {
                const players = World.getPlayers().map(player => player.nameTag);
                Commands.run(`testfor @a[name="${players[0]}"]`, World.getDimension("overworld"));
                try {
                    // (1..) gametest already enabled so set loaded to true and do nothing
                    Commands.run(`testfor @a[scores={gametestapi=1..}]`, World.getDimension("overworld"));
                    loaded = true;
                } catch {
                    // (..0) gametest needs to be enabled (1..) then set loaded to true
                    Commands.run(`testfor @a[scores={gametestapi=..0}]`, World.getDimension("overworld"));
                    Commands.run(`execute "${players[0]}" ~~~ function checks/gametestapi`, World.getDimension("overworld"));
                    loaded = true;
                    return;
                }
            }
        } catch (error) {}
    }, 40) //Executes every 2 seconds
}

export { GametestCheck }