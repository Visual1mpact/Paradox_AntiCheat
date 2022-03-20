import { world, BlockLocation, MinecraftBlockTypes, MinecraftItemTypes, ItemStack } from "mojang-minecraft";
import { illegalitems, fishbuckets } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

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
    let inventory = block.getComponent('inventory').container;
    if (inventory) {
        for (let i = 0; i < inventory.size; i++) {
            let inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            }
            // Check if item found inside the container exceeds max allowed stack or is illegal
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped') || inventory_item.amount > config.modules.illegalitemsC.maxStack && !player.hasTag('paradoxOpped')) {
                flag(player, "IllegalItems", "C", "Exploit", false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air));
                rip(player);
            // There is a new hack which crashes server/realms using fish buckets
            // We don't need to ban these items
            // We replace them instead to delete the NBT so we can still use them safely
            } else if (fishbuckets.includes(inventory_item.id) && !player.hasTag('paradoxOpped')) {
                if (inventory_item.id === 'minecraft:axolotl_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.axolotlBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:cod_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.codBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:salmon_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.salmonBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:tropical_fish_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.tropicalFishBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:powder_snow_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.powderSnowBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:pufferfish_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.pufferfishBucket));
                    } catch {}
                }
                if (inventory_item.id === 'minecraft:tadpole_bucket') {
                    try {
                        inventory.setItem(i, new ItemStack(MinecraftItemTypes.tadpoleBucket));
                    } catch {}
                }
            }
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(object => illegalitemsc(object));
};

export { IllegalItemsC };
