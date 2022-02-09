import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const InvalidSprintA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // get all tags of the player
            let playerTags = getTags(player);

            // invalidsprint/a = checks for sprinting with the blindness effect
            if (player.getEffect(Minecraft.MinecraftEffectTypes.blindness) && playerTags.includes('sprint')) {
                try {
                    player.dimension.runCommand(`testfor @a[name=${player.nameTag},tag=sprint]`);
                    flag(player, "InvalidSprint", "A", "Movement", false, false, true, false);
                } catch(error) {}
            }
        }
    }, 40) //Executes every 2 seconds
}

export { InvalidSprintA }