import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const BedrockValidate = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // bedrock validation
            if (config.modules.bedrockValidate.enabled && config.modules.bedrockValidate.overworld) {
                try {
                    // only run the rest of the commands if the player is in the overworld
                    Commands.run(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`, World.getDimension("overworld"));
                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`, World.getDimension("overworld"));
                    } catch (error) {}

                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-4 -59 ~-4 ~4 319 ~4 air 0 replace bedrock`, World.getDimension("overworld"));
                    } catch (error) {}
                } catch (error) {}
            }

            if (config.modules.bedrockValidate.enabled && config.modules.bedrockValidate.nether) {
                try {
                    // only run the rest of the commands if the player is in the nether
                    Commands.run(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`, World.getDimension("nether"));
                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 0 ~-10 ~10 0 ~10 bedrock`, World.getDimension("nether"));
                    } catch (error) {}

                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 127 ~-10 ~10 127 ~10 bedrock`, World.getDimension("nether"));
                    } catch (error) {}

                    try {
                        Commands.run(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`, World.getDimension("nether"));
                    } catch (error) {}
                } catch(error) {}
            }
        }
    }, 40) //Executes every 2 seconds
}

export { BedrockValidate }