import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ReachA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // reach/a
            if (player.hasTag('attack')) {
                try {                                                                   // we could use r=4 but that wont account for lag
                    player.runCommand(`execute @a[name="${player.nameTag}",tag=attack,m=!c] ~~~ testfor @p[name=!"${player.nameTag}",r=${config.modules.reachA.reach}]`);
                } catch (error) {
                    try {
                        player.runCommand(`execute @a[name="${player.nameTag}",tag=attack,m=!c] ~~~ function checks/alerts/reach`);
                    } catch (error2) {}
                }
            }
        }
    }, 40); // Executes every 2 seconds
};

export { ReachA };