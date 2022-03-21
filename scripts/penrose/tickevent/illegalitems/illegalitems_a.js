import { world, ItemStack, MinecraftItemTypes, Items } from "mojang-minecraft";
import { illegalitems, salvageable } from "../../../data/itemban.js";
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
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped') || inventory_item.amount > config.modules.illegalitemsA.maxStack && !player.hasTag('paradoxOpped')) {
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
            } else if (salvageable.includes(inventory_item.id) && !player.hasTag('paradoxOpped')) {
                // There are only 43 splash potions from 0 to 42
                // If data exceeds this then it is a hack so replace with data 0
                if (inventory_item.id === "minecraft:splash_potion" && inventory_item.data > 42) {
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount));
                    } catch (error) {}
                } else {
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                }
            }
        }
    }
}

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => illegalitemsa());
};

export { IllegalItemsA };