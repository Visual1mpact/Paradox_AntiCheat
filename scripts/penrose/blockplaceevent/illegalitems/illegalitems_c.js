import { world, BlockLocation, MinecraftBlockTypes, MinecraftItemTypes, ItemStack, Items } from "mojang-minecraft";
import { illegalitems, salvageable } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag, disabler } from "../../../util.js";

const World = world;

function rip(player) {
    // Get all tags
    let tags = player.getTags();

    // This removes old ban tags
    tags.forEach(t => {
        if(t.startsWith("Reason:")) {
            player.removeTag(t);
        }
        if(t.startsWith("By:")) {
            player.removeTag(t);
        }
    });
    // Tag with reason and by who
    try {
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item"`);
        player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
        player.addTag('isBanned');
    // Despawn if we cannot kick the player
    } catch (error) {
        player.triggerEvent('paradox:kick');
    }
}

function illegalitemsc(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsC.enabled === false) {
        World.events.blockPlace.unsubscribe(illegalitemsc);
        return;
    }

    // Properties from class
    let { block, player, dimension } = object;
    // Block coordinates
    let { x, y, z } = block.location;
    // Check if place item is illegal
    if(illegalitems.includes(block.id) && !player.hasTag('paradoxOpped')) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        flag(player, "IllegalItems", "C", "Exploit", false, false, false, false);
        rip(player);
    }
    // Check if placed item has a inventory container
    let inventory;
    try {
        inventory = block.getComponent('inventory').container;
    } catch (error) {}
    if (inventory && !player.hasTag('paradoxOpped')) {
        for (let i = 0; i < inventory.size; i++) {
            let inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            } else if (block.id !== "minecraft:shulker_box" || block.id !== "minecraft:undyed_shulker_box" || block.id !== "minecraft:ender_chest") {
                // Most items with a container should be empty when placing down
                // If we detect items in the container when being placed then it is a hack
                flag(player, "IllegalItems", "C", "Exploit", false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air));
                rip(player);
            }
            // Check if item found inside the container exceeds max allowed stack or is illegal
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped') || inventory_item.amount > config.modules.illegalitemsC.maxStack && !player.hasTag('paradoxOpped')) {
                flag(player, "IllegalItems", "C", "Exploit", false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air));
                rip(player);
            } else if (salvageable.includes(inventory_item.id) && !player.hasTag('paradoxOpped')) {
                // We don't need to ban these items
                // We replace them instead to delete the NBT so we can still use them safely
                try {
                    inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                } catch {}
            }
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(object => illegalitemsc(object));
};

export { IllegalItemsC };
