import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function badpackets2() {
    // Get Dynamic Property
    let badPackets2Boolean = World.getDynamicProperty('badpackets2_b');
    if (badPackets2Boolean === undefined) {
        badPackets2Boolean = config.modules.badpackets2.enabled;
    }
    // Unsubscribe if disabled in-game
    if (badPackets2Boolean === false) {
        World.events.tick.unsubscribe(badpackets2);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Invalid slot
        if(player.selectedSlot < 0 || player.selectedSlot > 8) {
            flag(player, "BadPackets", "2", "Exploit", null, null, "selectedSlot", `${player.selectedSlot}`, false, null);
            player.selectedSlot = 0;
        }
    }
}

const BadPackets2 = () => {
    World.events.tick.subscribe(badpackets2);
};

export { BadPackets2 };