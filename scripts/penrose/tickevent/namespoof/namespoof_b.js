import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const NamespoofB = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");
            
            // Namespoof/B = regex check
            try {
                if (config.modules.namespoofB.regex.test(player.name)) {
                    flag(player, "Namespoof", "B", "Exploit", false, false, false, false);
                }
            } catch(error) {}
        }
    }, 40); // Executes every 2 seconds
};

export { NamespoofB };