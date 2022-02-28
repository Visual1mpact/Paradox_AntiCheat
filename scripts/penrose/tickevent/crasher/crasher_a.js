import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const CrasherA = () => {
    World.events.tick.subscribe(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");
            // Crasher/A = invalid pos check
            if (Math.abs(player.location.x) > 30000000 || Math.abs(player.location.y) > 30000000 || Math.abs(player.location.z) > 30000000) {
                flag(player, "Crasher", "A", "Exploit", false, false, true, false);
            }
        }
    });
};

export { CrasherA };