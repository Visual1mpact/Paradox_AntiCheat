import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const BedrockValidate = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // bedrock validation
            if (config.modules.bedrockValidate.overworld) {
                try {
                    // only run the rest of the commands if the player is in the overworld
                    World.getDimension("overworld").runCommand(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`);
                    try {
                        World.getDimension("overworld").runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`);
                    } catch (error) {}

                    try {
                        World.getDimension("overworld").runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-4 -59 ~-4 ~4 319 ~4 air 0 replace bedrock`);
                    } catch (error) {}
                } catch (error) {}
            }

            if (config.modules.bedrockValidate.nether) {
                try {
                    // only run the rest of the commands if the player is in the nether
                    World.getDimension("nether").runCommand(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`);
                    try {
                        World.getDimension("nether").runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 0 ~-10 ~10 0 ~10 bedrock`);
                    } catch (error) {}

                    try {
                        World.getDimension("nether").runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 127 ~-10 ~10 127 ~10 bedrock`);
                    } catch (error) {}

                    try {
                        World.getDimension("nether").runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`);
                    } catch (error) {}
                } catch(error) {}
            }
        }
    }, 40) //Executes every 2 seconds
}

export { BedrockValidate }