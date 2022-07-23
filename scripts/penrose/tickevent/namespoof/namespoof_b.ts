import { Player, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { clearTickInterval, setTickInterval } from "../../../misc/scheduling.js";

const World = world;

function rip(player: Player) {
    // Tag with reason and by who
    try {
        player.addTag("Reason:Namespoof B (Disabler)");
        player.addTag("By:Paradox");
        player.addTag("isBanned");
        // Despawn if we cannot kick the player
    } catch (error) {
        player.triggerEvent("paradox:kick");
    }
}

function namespoofb(id: number) {
    // Get Dynamic Property
    let nameSpoofBoolean = World.getDynamicProperty("namespoofb_b");
    if (nameSpoofBoolean === undefined) {
        nameSpoofBoolean = config.modules.namespoofB.enabled;
    }
    // Unsubscribe if disabled in-game
    if (nameSpoofBoolean === false) {
        clearTickInterval(id);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // Namespoof/B = regex check
        if (config.modules.namespoofB.banregex.test(player.name)) {
            rip(player);
        } else if (config.modules.namespoofB.kickregex.test(player.name)) {
            flag(player, "Namespoof", "B", "Exploit", null, null, null, null, false, null);
        }
    }
    return;
}

const NamespoofB = () => {
    // Executes every 2 seconds
    const id = setTickInterval(() => namespoofb(id), 40);
};

export { NamespoofB };
