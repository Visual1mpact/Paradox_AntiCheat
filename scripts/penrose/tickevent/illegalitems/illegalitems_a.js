import { world, ItemStack, MinecraftItemTypes, EntityHealableComponent } from "mojang-minecraft";
import { fishbuckets, illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { disabler, flag } from "../../../util.js";

const World = world;

function illegalitemsa() {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsA.enabled === false) {
        World.events.tick.unsubscribe(illegalitemsa);
        return;
    }

    for (let player of World.getPlayers()) {
        let inventory = player.getComponent('minecraft:inventory').container;
        for (let i = 0; i < inventory.size; i++) {
            let inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            }
            // If player has an illegal item or stacks over 64 then we clear the item and kick them
            // If we cannot kick them then we despawn them (no mercy)
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped') || inventory_item.id > config.modules.illegalitemsA.maxStack && !player.hasTag('paradoxOpped')) {
                flag(player, "IllegalItems", "A", "Exploit", false, false, false, false);
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air));
                } catch {}
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
            }
        }
    }
}

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => illegalitemsa());
};

export { IllegalItemsA };