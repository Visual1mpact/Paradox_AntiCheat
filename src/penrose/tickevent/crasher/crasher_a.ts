import { world, system } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { kickablePlayers } from "../../../kickcheck.js";

const World = world;

function crashera(id: number) {
    // Get Dynamic Property
    let crasherABoolean = World.getDynamicProperty("crashera_b");
    if (crasherABoolean === undefined) {
        crasherABoolean = config.modules.crasherA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (crasherABoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of World.getPlayers()) {
        // Crasher/A = invalid pos check
        if (Math.abs(player.location.x) > 30000000 || Math.abs(player.location.y) > 30000000 || Math.abs(player.location.z) > 30000000) {
            flag(player, "Crasher", "A", "Exploit", null, null, null, null, true, null);
            try {
                player.addTag("Reason:Crasher");
                player.addTag("By:Paradox");
                player.addTag("isBanned");
            } catch (error) {
                kickablePlayers.add(player);
                player.triggerEvent("paradox:kick");
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function CrasherA() {
    const crasherAId = system.runSchedule(() => {
        crashera(crasherAId);
    });
}
