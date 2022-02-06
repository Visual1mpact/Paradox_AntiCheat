import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;

const NamespoofA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // Namespoof/A = username length check.
            try {
                if (config.modules.namespoofA.enabled && player.name.length < config.modules.namespoofA.minNameLength || player.name.length > config.modules.namespoofA.maxNameLength) {
                    flag(player, "Namespoof", "A", "Exploit", "nameLength", player.name.length, false, false);
                }
            } catch(error) {}
        }
    }, 40) //Executes every 2 seconds
}

export { NamespoofA }