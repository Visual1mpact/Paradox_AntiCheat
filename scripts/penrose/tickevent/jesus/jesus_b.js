import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const JesusB = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // get all tags of the player
            let playerTags = getTags(player);

            // jesus/b = motion check
            try {
                if (Math.abs(player.velocity.y).toFixed(4) <= config.modules.jesusB.maxMotion && Math.abs(player.velocity.y).toFixed(4) >= config.modules.jesusB.minMotion && !player.getEffect(Minecraft.MinecraftEffectTypes.slowFalling)) {
                    try {
	                    // Make sure Anti Jesus is turned on
	                    Commands.run(`testfor @a[name="${player.nameTag}",scores={jesus=1..}]`, World.getDimension("overworld"));
	                    if (!playerTags.includes('flying') && !playerTags.includes('jump') && !playerTags.includes('ground') && !playerTags.includes('gliding') && !playerTags.includes('levitating') && !playerTags.includes('vanish') && !playerTags.includes('swimming') ) {
	                        Commands.run(`execute @a[name="${player.nameTag}",tag=!flying,m=!c,tag=!jump,tag=!ground,tag=!gliding,tag=!levitating,tag=!vanish,tag=!swimming] ~~~ detect ~~-1~ water 0 list`, World.getDimension("overworld"));
	                        flag(player, "Jesus", "B", "Movement", "yMotion", Math.abs(player.velocity.y).toFixed(4), true, false);
				        }
                    } catch (error2) {}
                }
            } catch (error) {}
        }
    }, 40) //Executes every 2 seconds
}

export { JesusB }