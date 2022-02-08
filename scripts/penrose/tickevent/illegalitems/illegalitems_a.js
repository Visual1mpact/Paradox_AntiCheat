import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js"
import { getTags } from "../../../util.js";
import config from "../../../data/config.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => {
        World.getPlayers().forEach(player => {
            
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // get all tags of the player
            let playerTags = getTags(player);

            let inventory = player.getComponent('minecraft:inventory').container
            let inventory_items = []
            for (let i = 0; i < inventory.size; i++) {
                try {
                    let inventory_i = inventory.getItem(i)
                    inventory_items.push(inventory_i.id)
                } catch (error) {}
            }
            // If player has an illegal item we clear their entire inventory then kick them
            // If we cannot kick them then we despawn them (no mercy)
            inventory_items.forEach(item => {
                if (illegalitems.includes(item) && !playerTags.includes('op') || item > config.modules.illegalitemsA.maxStack && !playerTags.includes('op')) {
                    try {
                        Commands.run(`clear "${player.nameTag}"`, World.getDimension('overworld'))
                        Commands.run(`tag "${player.nameTag}" add "isBanned"`, World.getDimension('overworld'))
                    } catch (error) {}
                    player.triggerEvent('paradox:kick')
                }
            })
        })
    })
}

export { IllegalItemsA }