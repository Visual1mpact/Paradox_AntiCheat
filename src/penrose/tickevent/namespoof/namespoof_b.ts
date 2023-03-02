import { Player, world, system } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function rip(player: Player) {
    // Tag with reason and by who
    try {
        player.addTag("Reason:Namespoof B (Disabler)");
        player.addTag("By:Paradox");
        player.addTag("isBanned");
        // Despawn if we cannot kick the player
    } catch (error) {
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

function namespoofb(id: number) {
    // Get Dynamic Property
    const nameSpoofBoolean = dynamicPropertyRegistry.get("namespoofb_b");

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
        // Namespoof/B = regex check
        if (config.modules.namespoofB.banregex.test(player.nameTag)) {
            player.nameTag = player.nameTag.replaceAll(config.modules.namespoofB.banregex, "");
            rip(player);
        } else if (config.modules.namespoofB.kickregex.test(player.nameTag)) {
            player.nameTag = player.nameTag.replaceAll(config.modules.namespoofB.kickregex, "");
            flag(player, "Namespoof", "B", "Exploit", null, null, null, null, false, null);
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function NamespoofB() {
    const nameSpoofBId = system.runSchedule(() => {
        namespoofb(nameSpoofBId);
    }, 40);
}
