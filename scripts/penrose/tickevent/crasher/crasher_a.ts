import { world } from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function crashera() {
    // Get Dynamic Property
    let crasherABoolean = World.getDynamicProperty("crashera_b");
    if (crasherABoolean === undefined) {
        crasherABoolean = config.modules.crasherA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (crasherABoolean === false) {
        World.events.tick.unsubscribe(crashera);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Crasher/A = invalid pos check
        if (Math.abs(player.location.x) > 30000000 || Math.abs(player.location.y) > 30000000 || Math.abs(player.location.z) > 30000000) {
            flag(player, "Crasher", "A", "Exploit", null, null, null, null, true, null);
            try {
                player.addTag("Reason:Crasher");
                player.addTag("By:Paradox");
                player.addTag("isBanned");
            } catch (error) {
                player.triggerEvent("paradox:kick");
            }
        }
    }
}

const CrasherA = () => {
    World.events.tick.subscribe(crashera);
};

export { CrasherA };
