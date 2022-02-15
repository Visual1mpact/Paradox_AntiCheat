import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const FlyA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");
            
            // get all tags of the player
            let playerTags = getTags(player);

            // fly/a = checks for creative fly while in survival
            if(Math.abs(player.velocity.y).toFixed(4) == 0.2250) {
                if(playerTags.includes('moving') && !playerTags.includes('ground') && !playerTags.includes('gliding') && !playerTags.includes('levitating') && !playerTags.includes('flying')) {
                    try {
                        player.runCommand(`testfor @a[name="${player.nameTag}",tag=moving,tag=!ground,tag=!gliding,tag=!levitating,m=!c,tag=!flying]`);
                        flag(player, "Fly", "A", "Movement", "yVelocity", Math.abs(player.velocity.y).toFixed(4), true, false);
                    } catch(error) {}
                }
            }
        }
    }, 40); // Executes every 2 seconds
};

export { FlyA };