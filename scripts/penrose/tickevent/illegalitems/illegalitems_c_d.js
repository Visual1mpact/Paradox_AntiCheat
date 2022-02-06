import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;

const IllegalItemsCD = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            if(config.modules.illegalitemsC.enabled || config.modules.illegalitemsD.enabled) {
                let container = player.getComponent('inventory').container;
                for (let i = 0; i < container.size; i++) if (container.getItem(i)) {
                    let item = container.getItem(i);
                    // Illegalitems/C = item stacked over 64 check
                    if(config.modules.illegalitemsC.enabled && item.amount > config.modules.illegalitemsC.maxStack)
                        flag(player, "IllegalItems", "C", "Exploit", "stack", item.amount, false, false, i);
                    
                    // Illegalitems/D = additional item clearing check
                    if (config.modules.illegalitemsD.enabled && config.modules.illegalitemsD.illegalItems.includes(item.id))
                        flag(player, "IllegalItems", "D", "Exploit", "item", item.id, false, false, i);
                }
            }
        }
    }, 40) //Executes every 2 seconds
}

export { IllegalItemsCD }