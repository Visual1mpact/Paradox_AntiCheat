import { world, BlockLocation, MinecraftBlockTypes, MinecraftItemTypes, ItemStack, Items, MinecraftEnchantmentTypes, BlockProperties } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import config from "../../../data/config.js";
import { flag, disabler, toCamelCase, crypto } from "../../../util.js";
import { enchantmentSlot } from "../../../data/enchantments.js";

const World = world;

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
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item C (${inventory_item.id.replace("minecraft:", "")}=${inventory_item.amount})"`);
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

    // Return if player has op
    if (player.hasTag('Hash:' + crypto)) {
        return;
    }

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (config.modules.antishulker.enabled && block.id === "minecraft:shulker_box" || config.modules.antishulker.enabled && block.id === "minecraft:undyed_shulker_box") {
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${block.id.replace("minecraft:", "")} from ${disabler(player.nameTag)}."}]}`);
        } catch (error) {}
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!"}]}`);
        // Set block in world
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes[toCamelCase(block.id.replace("minecraft:", ""))]);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        return;
    }
    // Check if place item is salvageable
    if (salvageable[block.id]) {
        // Block from specified location
        let blockLoc = dimension.getBlock(new BlockLocation(x, y, z));
        // Get a copy of this blocks permutation
        let blockPerm = blockLoc.permutation;
        // Get the direction property
        blockPerm.getProperty(BlockProperties.direction);
        // Set block in world
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes[toCamelCase(block.id.replace("minecraft:", ""))]);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace ${block.id} 0`);
        } catch (error) {}
        // Update block with modified permutation to correct its direction
        blockLoc.setPermutation(blockPerm);
    }
    // Check if place item is illegal
    if(illegalitems.includes(block.id)) {
        // Set block in world
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes[toCamelCase(block.id.replace("minecraft:", ""))]);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        flag(player, "IllegalItems", "C", "Exploit", false, false, false, false, false, false);
        return rip(player);
    }
    // Check if placed item has a inventory container
    let inventory;
    try {
        inventory = block.getComponent('inventory').container;
    } catch (error) {}
    if (inventory) {
        for (let i = 0; i < inventory.size; i++) {
            let inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            }
            // Check if item found inside the container is salvageable
            let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
            // Check if data exceeds vanilla data
            if (salvageable[inventory_item.id] && uniqueItems.indexOf(salvageable[inventory_item.id].name) !== -1 && salvageable[inventory_item.id].data < inventory_item.data) {
                // Reset item to data type of 0
                try {
                    inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount));
                } catch (error) {}
                continue;
            } else if (salvageable[inventory_item.id].data !== inventory_item.data && uniqueItems.indexOf(salvageable[inventory_item.id].name) === -1) {
                // Reset item to data type of equal data if they do not match
                try {
                    inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, salvageable[inventory_item.id].data));
                } catch (error) {}
                continue;
            } else if (salvageable[inventory_item.id]) {
                // Reset item to data type of equal data because we take no chances
                try {
                    inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                } catch (error) {}
                continue;
            }
            // Check if item found inside the container is illegal
            if (illegalitems.includes(inventory_item.id)) {
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                return rip(player, inventory_item);
            }
            // Check if item found inside container exceeds allowed stacks
            if (inventory_item.amount > config.modules.illegalitemsC.maxStack) {
                // Item stacks over 64 we remove
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, "Stacks", block.id.replace('minecraft:', ""), false, false);
                // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                try {
                    player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} detected with stacked items greater than x64."}]}`);
                } catch (error) {}
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Stacked items cannot exceed x64!"}]}`);
                if (config.modules.stackBan.enabled) {
                    return rip(player, inventory_item);
                }
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch (error) {}
                continue;
            }
            // Check items for illegal lores
            if (config.modules.illegalLores.enabled && !config.modules.illegalLores.exclude.includes(String(inventory_item.getLore()))) {
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                try {
                    player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${inventory.id.replace("minecraft:", "")} with lore from ${disabler(player.nameTag)}."}]}`);
                } catch (error) {}
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Items with illegal Lores are not allowed!"}]}`);
                continue;
            }
            if (config.modules.illegalEnchantment.enabled) {
                // We get a list of enchantments on this item
                let item_enchants = inventory_item.getComponent("minecraft:enchantments").enchantments;
                // List of allowed enchantments on item
                let enchantedSlot = enchantmentSlot[item_enchants.slot];
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
                        // Is this item allowed to have this enchantment
                        let enchantLevel = enchantedSlot[enchants];
                        if (!enchantLevel) {
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
                            break;
                        }
                        // Does the enchantment type exceed or break vanilla levels
                        if (enchant_data && enchant_data.level > enchantLevel || enchant_data && enchant_data.level < 0) {
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
                            break;
                        }
                    }
                    continue;
                }
            }
            // Check if item container is not empty
            if (block.id !== "minecraft:shulker_box" || block.id !== "minecraft:undyed_shulker_box" || block.id !== "minecraft:ender_chest") {
                // Most items with a container should be empty when placing down
                // If we detect items in the container when being placed then it is a hack
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, "Container", block.id.replace('minecraft:', ""), false, false);
                // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                try {
                    player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} placed a nested chest at X=${x.toFixed(0)}, Y=${y.toFixed(0)}, Z=${z.toFixed(0)}. Chest has been cleared!"}]}`);
                } catch (error) {}
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Nested chests are not allowed. This chest has been cleared!"}]}`);
                // Clear this container from the world
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                continue;
            }
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(object => illegalitemsc(object));
};

export { IllegalItemsC };
