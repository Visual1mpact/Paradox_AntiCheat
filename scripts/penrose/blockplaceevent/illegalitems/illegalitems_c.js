import { world, BlockLocation, MinecraftBlockTypes, MinecraftItemTypes, ItemStack, Items, MinecraftEnchantmentTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import config from "../../../data/config.js";
import { flag, disabler } from "../../../util.js";

const World = world;

// Custom property
let pl = {
    verify: 0,
    verify2: 0
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
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item (${inventory_item.id.replace("minecraft:", "")}=${inventory_item.amount})"`);
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
    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (config.modules.antishulker.enabled && block.id === "minecraft:shulker_box" && !player.hasTag('paradoxOpped') || config.modules.antishulker.enabled && block.id === "minecraft:undyed_shulker_box" && !player.hasTag('paradoxOpped')) {
        return dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
    }
    // Check if place item is illegal
    if(illegalitems.includes(block.id) && !player.hasTag('paradoxOpped')) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        flag(player, "IllegalItems", "C", "Exploit", false, false, false, false, false, false);
        return rip(player);
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
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                pl.verify = 1;
                continue;
            }
            // We get a list of enchantments on this item
            let item_enchants = inventory_item.getComponent("minecraft:enchantments").enchantments;
            // Check if enchantment is illegal on item
            if (item_enchants) {
                for (let enchants in MinecraftEnchantmentTypes) {
                    // If no enchantment then move to next loop
                    let enchanted = MinecraftEnchantmentTypes[enchants];
                    if (!item_enchants.hasEnchantment(enchanted)) {
                        continue;
                    }
                    // Get properties of this enchantment
                    let enchant_data = item_enchants.getEnchantment(MinecraftEnchantmentTypes[enchants]);
                    // Does the enchantment type exceed or break vanilla levels
                    if (enchant_data && enchant_data.level > MinecraftEnchantmentTypes[enchants].maxLevel || enchant_data && enchant_data.level < 0) {
                        // Remove this item immediately
                        try {
                            inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                        } catch {}
                        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                        try {
                            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4[§f${disabler(player.nameTag)}§4]§r §6=>§r §4[§f${block.id.replace("minecraft:", "")}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r"}]}`);
                            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${disabler(player.nameTag)}."}]}`);
                        } catch (error) {}
                        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!"}]}`);
                        continue;
                    }
                }
            }
            // Check if item found inside the container is illegal
            if (illegalitems.includes(inventory_item.id) && !player.hasTag('paradoxOpped')) {
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                return rip(player, inventory_item);
            } else if (salvageable[inventory_item.id] && !player.hasTag('paradoxOpped')) {
                let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
                // Check if data exceeds vanilla data
                if (uniqueItems.indexOf(salvageable[inventory_item.id].name) !== -1 && salvageable[inventory_item.id].data < inventory_item.data) {
                    // Reset item to data type of 0
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount));
                    } catch (error) {}
                } else if (salvageable[inventory_item.id].data !== inventory_item.data && uniqueItems.indexOf(salvageable[inventory_item.id].name) === -1) {
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
            } else if (inventory_item.amount > config.modules.illegalitemsC.maxStack && !player.hasTag('paradoxOpped')) {
                // Item stacks over 64 we remove
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch (error) {}
                pl.verify2 = 1;
            }
        }
        // Handles stacked items
        if (pl.verify === 1) {
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} detected with stacked items greater than x64."}]}`);
            } catch (error) {}
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Stacked items cannot exceed x64!"}]}`);
            pl.verify2 = 0;
            if (config.modules.stackBan.enabled) {
                return rip(player, inventory_item);
            }
        }
        // Handles containers
        if (pl.verify === 1) {
            flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, "Container", block.id.replace('minecraft:', ""), false, false);
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} placed a nested chest at X=${player.location.x}, Y=${player.location.y}, Z=${player.location.z}. Chest has been cleared!"}]}`);
            } catch (error) {}
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Nested chests are not allowed. This chest has been cleared!"}]}`);
            pl.verify = 0;
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(object => illegalitemsc(object));
};

export { IllegalItemsC };
