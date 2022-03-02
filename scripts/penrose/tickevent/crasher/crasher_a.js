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
                let tags = player.getTags();
                // This removes old ban tags
                tags.forEach(t => {
                    if(t.startsWith("Reason:")) {
                        player.removeTag(t.slice(1));
                    }
                    if(t.startsWith("By:")) {
                        player.removeTag(t.slice(1));
                    }
                });
                try {
                    player.runCommand(`clear "${player.nameTag}"`);
                } catch (error) {}
                try {
                    player.runCommand(`tag "${player.nameTag}" add "Reason:Crasher"`);
                    player.runCommand(`tag "${player.nameTag}" add "By:Paradox"`);
                    player.addTag('isBanned');
                } catch (error) {
                    player.triggerEvent('paradox:kick');
                }
            }
        }
    });
};

export { CrasherA };