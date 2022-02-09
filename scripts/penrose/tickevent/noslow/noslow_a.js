import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const NoSlowA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // get all tags of the player
            let playerTags = getTags(player);

            // NoSlow/A = speed limit check
            if(Math.sqrt(Math.abs(player.velocity.x**2 + player.velocity.z**2)).toFixed(3) >= config.modules.noslowA.speed) {
                if (!player.getEffect(Minecraft.MinecraftEffectTypes.speed) && playerTags.includes('ground') && playerTags.includes('sprint') && !playerTags.includes('jump') && !playerTags.includes('gliding') && !playerTags.includes('swimming')) {
                    try {
                	    player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=ground,tag=sprint,tag=!jump,tag=!gliding,tag=!swimming]`);
                        flag(player, "NoSlow", "A", "Movement", "speed", Math.sqrt(Math.abs(player.velocity.x**2 + player.velocity.z**2)).toFixed(3), true, false);
                    } catch(error) {}
                }
            }
        }
    }, 40) //Executes every 2 seconds
}

export { NoSlowA }