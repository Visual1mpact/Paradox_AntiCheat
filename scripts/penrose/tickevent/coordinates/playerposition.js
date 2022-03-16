import { world } from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";
import { disabler } from "../../../util.js";

const World = world;

const PlayerPosition = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // player position
            try {
                player.runCommand(`scoreboard players set ${disabler(player.nameTag)} xPos ${Math.floor(player.location.x)}`);
                player.runCommand(`scoreboard players set ${disabler(player.nameTag)} yPos ${Math.floor(player.location.y)}`);
                player.runCommand(`scoreboard players set ${disabler(player.nameTag)} zPos ${Math.floor(player.location.z)}`);
            } catch(e) {}
        }
    }, 20); // Executes every 1 seconds
};

export { PlayerPosition };