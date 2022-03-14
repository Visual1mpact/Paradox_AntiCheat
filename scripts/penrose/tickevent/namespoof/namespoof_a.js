import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function namespoofa() {
    // Unsubscribe if disabled in-game
    if (config.modules.namespoofA.enabled === false) {
        World.events.tick.unsubscribe(namespoofa);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Namespoof/A = username length check.
        try {
            if (player.name.length < config.modules.namespoofA.minNameLength && !player.hasTag('paradoxOpped') || player.name.length > config.modules.namespoofA.maxNameLength && !player.hasTag('paradoxOpped')) {
                flag(player, "Namespoof", "A", "Exploit", "nameLength", player.name.length, false, false);
            }
        } catch(error) {}
    }
}

const NamespoofA = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofa(), 40);
};

export { NamespoofA };