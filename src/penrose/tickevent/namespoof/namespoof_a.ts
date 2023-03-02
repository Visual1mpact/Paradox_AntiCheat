import { world, system } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function namespoofa(id: number) {
    // Get Dynamic Property
    const nameSpoofBoolean = dynamicPropertyRegistry.get("namespoofa_b");

    // Unsubscribe if disabled in-game
    if (nameSpoofBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of World.getPlayers()) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // Namespoof/A = username length check.
        try {
            if (player.name.length < config.modules.namespoofA.minNameLength || player.name.length > config.modules.namespoofA.maxNameLength) {
                flag(player, "Namespoof", "A", "Exploit", null, null, "nameLength", String(player.name.length), false, null);
            }
        } catch (error) {}
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function NamespoofA() {
    const nameSpoofAId = system.runSchedule(() => {
        namespoofa(nameSpoofAId);
    }, 40);
}
