import { world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { clearTickInterval, setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function namespoofa(callback, id) {
    // Get Dynamic Property
    let nameSpoofBoolean = World.getDynamicProperty('namespoofa_b');
    if (nameSpoofBoolean === undefined) {
        nameSpoofBoolean = config.modules.namespoofA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (nameSpoofBoolean === false) {
        World.events.tick.unsubscribe(callback);
        clearTickInterval(id);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty('hash');
        let salt = player.getDynamicProperty('salt');
        let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
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
    let callback;
    const id = setTickInterval(callback = () => namespoofa(callback, id), 40);
    id();
};

export { NamespoofA };