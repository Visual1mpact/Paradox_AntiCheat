import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js"
import { flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => {
        World.getPlayers().forEach(player => {
            
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            let inventory = player.getComponent('minecraft:inventory').container
            let inventory_items = []
            for (let i = 0; i < inventory.size; i++) {
                try {
                    let inventory_i = inventory.getItem(i);

                    // Unauthorized items
                    if (illegalitems.includes(inventory_i)) {
                        flag(player, "IllegalItems", "A", "Exploit", "item", inventory_i.id, false, false, i);
                    }
                    
                    // Items stacked over 64
                    if (inventory_i.amount > config.modules.illegalitems.maxStack) {
                        flag(player, "IllegalItems", "B", "Exploit", "stack", inventory_i.amount, false, false, i);
                    }
                    
                    inventory_items.push(inventory_i.id);
                    
                } catch (error) {}
            }
            // If player has an illegal item we clear their entire inventory then kick them
            // If we cannot kick them then we despawn them (no mercy)
            inventory_items.forEach(item => {
                if (illegalitems.includes(item)) {
                    try {
                        Commands.run(`clear "${player.nameTag}"`, World.getDimension('overworld'))
                    } catch (error) {}
                    player.triggerEvent('paradox:kick')
                }
            })
        })
    })
}

export { IllegalItemsA }