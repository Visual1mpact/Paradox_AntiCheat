import * as Minecraft from "mojang-minecraft";
import { getTags } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const ReachA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // get all tags of the player
            let playerTags = getTags(player);

            // reach/a
            if (config.modules.reachA.enabled && playerTags.includes('attack')) {
                try {                                                                   // we could use r=4 but that wont account for lag
                    Commands.run(`execute @a[name="${player.nameTag}",tag=attack,m=!c] ~~~ testfor @p[name=!"${player.nameTag}",r=${config.modules.reachA.reach}]`, World.getDimension("overworld"));
                } catch (error) {
                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",tag=attack,m=!c] ~~~ function checks/alerts/reach`, World.getDimension("overworld"));
                    } catch (error2) {}
                }
            }
        }
    }, 40) //Executes every 2 seconds
}

export { ReachA }