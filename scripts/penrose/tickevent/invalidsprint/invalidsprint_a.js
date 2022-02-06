import * as Minecraft from "mojang-minecraft";
import { flag, getTags } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

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
            if (config.modules.invalidsprintA.enabled && player.getEffect(Minecraft.MinecraftEffectTypes.blindness) && playerTags.includes('sprint')) {
                try {
                    Commands.run(`testfor @a[name=${player.nameTag},tag=sprint]`, World.getDimension("overworld"));
                    flag(player, "InvalidSprint", "A", "Movement", false, false, true, false);
                } catch(error) {}
            }
        }
    }, 40) //Executes every 2 seconds
}

export { InvalidSprintA }