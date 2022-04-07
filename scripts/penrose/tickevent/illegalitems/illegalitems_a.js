import { world, ItemStack, MinecraftItemTypes, Items } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import config from "../../../data/config.js";
import { disabler, flag } from "../../../util.js";

const World = world;

// Custom property
let pl = {
    verify: 0
}

function rip(player, inventory_item) {
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
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item (${inventory_item.id.replace("minecraft:", "")})"`);
        player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
        player.addTag('isBanned');
    // Despawn if we cannot kick the player
    } catch (error) {
        player.triggerEvent('paradox:kick');
    }
}

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
            // If shulker boxes are not allowed in the server then we handle this here
            // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
            if (config.modules.antishulker.enabled && inventory_item.id === "minecraft:shulker_box" && !player.hasTag('paradoxOpped') || config.modules.antishulker.enabled && inventory_item.id === "minecraft:undyed_shulker_box" && !player.hasTag('paradoxOpped')) {
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 1));
                } catch {}
                continue;
            }
            // If player has an illegal item we kick them
            // If we cannot kick them then we despawn them (no mercy)
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped')) {
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 1));
                } catch {}
                // Ban
                return rip(player, inventory_item);
            } else if (salvageable[inventory_item.id] && !player.hasTag('paradoxOpped')) {
                let potions = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion"];
                // Check if data exceeds vanilla data
                if (potions.indexOf(salvageable[inventory_item.id].name) !== -1 && salvageable[inventory_item.id].data < inventory_item.data) {
                    // Reset item to data type of 0
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount));
                    } catch (error) {}
                } else if (salvageable[inventory_item.id].data !== inventory_item.data && potions.indexOf(salvageable[inventory_item.id].name) === -1) {
                    // Reset item to data type of equal data if they do not match
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, salvageable[inventory_item.id].data));
                    } catch (error) {}
                } else {
                    // Reset item to data type of equal data because we take no chances
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                }
            } else if (inventory_item.amount > config.modules.illegalitemsA.maxStack && !player.hasTag('paradoxOpped')) {
                // Item stacks over 64 we clear them
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 1));
                } catch {}
                pl.verify = 1;
            }
        }
        // Handle stacked items
        if (pl.verify === 1) {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} detected with stacked items greater than x64."}]}`);
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Stacked items cannot exceed x64!"}]}`);
            pl.verify = 0;
            if (config.modules.stackBan.enabled) {
                // Ban
                return rip(player, inventory_item);
            }
        }
    }
}

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => illegalitemsa());
};

export { IllegalItemsA };