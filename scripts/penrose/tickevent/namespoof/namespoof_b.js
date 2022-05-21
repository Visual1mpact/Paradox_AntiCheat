import { EntityQueryOptions, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function namespoofb() {
    // Unsubscribe if disabled in-game
    if (config.modules.namespoofB.enabled === false) {
        World.events.tick.unsubscribe(namespoofb);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['Hash:' + crypto];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        // Namespoof/B = regex check
        try {
            if (config.modules.namespoofB.regex.test(player.name)) {
                flag(player, "Namespoof", "B", "Exploit", false, false, false, false, false, false);
            }
        } catch(error) {}
    }
    return;
}

const NamespoofB = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofb(), 40);
};

export { NamespoofB };