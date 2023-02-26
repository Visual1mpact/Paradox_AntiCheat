import { world, system } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function badpackets2(id: number) {
    // Get Dynamic Property
    let badPackets2Boolean = World.getDynamicProperty("badpackets2_b");
    if (badPackets2Boolean === undefined) {
        badPackets2Boolean = config.modules.badpackets2.enabled;
    }
    // Unsubscribe if disabled in-game
    if (badPackets2Boolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of World.getPlayers()) {
        // Invalid slot
        if (player.selectedSlot < 0 || player.selectedSlot > 8) {
            flag(player, "BadPackets", "2", "Exploit", null, null, "selectedSlot", `${player.selectedSlot}`, false, null);
            player.selectedSlot = 0;
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function BadPackets2() {
    const badPackets2Id = system.runSchedule(() => {
        badpackets2(badPackets2Id);
    });
}
