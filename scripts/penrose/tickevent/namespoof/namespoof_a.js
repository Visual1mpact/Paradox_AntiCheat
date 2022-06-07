import { EntityQueryOptions, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function namespoofa() {
    // Get Dynamic Property
    let nameSpoofBoolean = World.getDynamicProperty('namespoofa_b');
    if (nameSpoofBoolean === undefined) {
        nameSpoofBoolean = config.modules.namespoofA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (nameSpoofBoolean === false) {
        World.events.tick.unsubscribe(namespoofa);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['Hash:' + crypto];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        // Namespoof/A = username length check.
        try {
            if (player.name.length < config.modules.namespoofA.minNameLength || player.name.length > config.modules.namespoofA.maxNameLength) {
                flag(player, "Namespoof", "A", "Exploit", false, false, "nameLength", player.name.length, false, false);
            }
        } catch(error) {}
    }
    return;
}

const NamespoofA = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofa(), 40);
};

export { NamespoofA };