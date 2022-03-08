import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

function namespoofb() {
    // Unsubscribe if disabled in-game
    if (config.modules.namespoofB.enabled === false) {
        World.events.tick.unsubscribe(namespoofb);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Namespoof/B = regex check
        try {
            if (config.modules.namespoofB.regex.test(player.name) && !player.hasTag('paradoxOpped')) {
                flag(player, "Namespoof", "B", "Exploit", false, false, false, false);
            }
        } catch(error) {}
    }
}

const NamespoofB = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofb(), 40);
};

export { NamespoofB };