import * as Minecraft from "mojang-minecraft";
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
            if (player.dimension === World.getDimension("overworld")) {
                try {
                    // only run the rest of the commands if the player is in the overworld
                    player.runCommand(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`);
                    try {
                        player.runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-20 -64 ~-20 ~20 -64 ~20 bedrock`);
                    } catch (error) {}
                } catch (error) {}
            }

            if (player.dimension === World.getDimension("nether")) {
                try {
                    // only run the rest of the commands if the player is in the nether
                    player.runCommand(`testfor @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}]`);
                    try {
                        player.runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 0 ~-10 ~10 0 ~10 bedrock`);
                    } catch (error) {}

                    try {
                        player.runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-10 127 ~-10 ~10 127 ~10 bedrock`);
                    } catch (error) {}

                    try {
                        player.runCommand(`execute @a[name="${player.nameTag}",rm=0,scores={bedrock=1..}] ~~~ fill ~-5 5 ~-5 ~5 120 ~5 air 0 replace bedrock`);
                    } catch (error) {}
                } catch(error) {}
            }
        }
    }, 20); // Executes every 1 second
};

export { BedrockValidate };