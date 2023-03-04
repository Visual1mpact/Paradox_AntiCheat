import { world, system } from "@minecraft/server";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function badpackets2(id: number) {
    // Get Dynamic Property
    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b");

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
