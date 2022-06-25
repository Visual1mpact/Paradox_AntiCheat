import { world, BlockLocation, MinecraftItemTypes, ItemStack, Items, MinecraftEnchantmentTypes, BlockProperties, Enchantment } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag, toCamelCase, crypto, titleCase, sendMsgToPlayer, sendMsg } from "../../../util.js";
import { enchantmentSlot } from "../../../data/enchantments.js";
import salvageable from "../../../data/salvageable.js";
import { whitelist } from "../../../data/whitelistitems.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";

const World = world;

function rip(player, inventory_item, enchant_data, block) {
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
    if (!enchant_data && !block) {
        // Tag with reason and by who
        try {
            player.addTag('Reason:Illegal Item C (' + inventory_item.id.replace("minecraft:", "") + '=' + inventory_item.amount + ')');
            player.addTag('By:Paradox');
            player.addTag('isBanned');
        // Despawn if we cannot kick the player
        } catch (error) {
            player.triggerEvent('paradox:kick');
        }
    } else if (!block) {
        // Tag with reason and by who
        try {
            player.addTag('Reason:Illegal Item C (' + inventory_item.id.replace("minecraft:", "") + ':' + enchant_data.type.id + '=' + enchant_data.level + ')');
            player.addTag('By:Paradox');
            player.addTag('isBanned');
        // Despawn if we cannot kick the player
        } catch (error) {
            player.triggerEvent('paradox:kick');
        }
    } else {
        // Tag with reason and by who
        try {
            player.addTag('Reason:Illegal Item C (' + block.type.id.replace("minecraft:", "") + ')');
            player.addTag('By:Paradox');
            player.addTag('isBanned');
        // Despawn if we cannot kick the player
        } catch (error) {
            player.triggerEvent('paradox:kick');
        }
    }
}

function illegalitemsc(object) {
    // Get Dynamic Property
    let illegalItemsCBoolean = World.getDynamicProperty('illegalitemsc_b');
    if (illegalItemsCBoolean === undefined) {
        illegalItemsCBoolean = config.modules.illegalitemsC.enabled;
    }
    let salvageBoolean = World.getDynamicProperty('salvage_b');
    if (salvageBoolean === undefined) {
        salvageBoolean = config.modules.salvage.enabled;
    }
    let illegalLoresBoolean = World.getDynamicProperty('illegallores_b');
    if (illegalLoresBoolean === undefined) {
        illegalLoresBoolean = config.modules.illegalLores.enabled;
    }
    let illegalEnchantmentBoolean = World.getDynamicProperty('illegalenchantment_b');
    if (illegalEnchantmentBoolean === undefined) {
        illegalEnchantmentBoolean = config.modules.illegalEnchantment.enabled;
    }
    let antiShulkerBoolean = World.getDynamicProperty('antishulker_b');
    if (antiShulkerBoolean === undefined) {
        antiShulkerBoolean = config.modules.antishulker.enabled;
    }
    let stackBanBoolean = World.getDynamicProperty('stackban_b');
    if (stackBanBoolean === undefined) {
        stackBanBoolean = config.modules.stackBan.enabled;
    }
    // Unsubscribe if disabled in-game
    if (illegalItemsCBoolean === false) {
        World.events.blockPlace.unsubscribe(illegalitemsc);
        return;
    }

    // Properties from class
    let { block, player, dimension } = object;
    // Block coordinates
    let { x, y, z } = block.location;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (antiShulkerBoolean && block.id === "minecraft:shulker_box" || antiShulkerBoolean && block.id === "minecraft:undyed_shulker_box") {
        sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r Removed ${block.id.replace("minecraft:", "")} from ${player.nameTag}.`);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        return;
    }
    let ignoreContainerPlace = [
    'minecraft:chest',
    'minecraft:trapped_chest'
    ];
    // Check if place item is salvageable
    if (salvageable[block.id] && !ignoreContainerPlace.includes(block.id)) {
        // Block from specified location
        let blockLoc = dimension.getBlock(new BlockLocation(x, y, z));
        // Get a copy of this blocks permutation
        let blockPerm = blockLoc.permutation;
        // Get the direction property
        blockPerm.getProperty(BlockProperties.direction);
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace ${block.id} 0`);
        } catch (error) {}
        // Update block with modified permutation to correct its direction
        blockLoc.setPermutation(blockPerm);
    }
    // Check if place item is illegal
    if(illegalitems.includes(block.type.id)) {
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        flag(player, "IllegalItems", "C", "Exploit", false, false, false, false, false, false);
        return rip(player, false, false, block);
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

            if (salvageBoolean && !whitelist.includes(inventory_item.id)) {
                /**
                 * Salvage System to mitigate NBT's on every item in the game
                 */
                let enchantArray = [];
                let enchantLevelArray = [];
                let verifiedItemName = inventory_item.nameTag;
                let newNameTag = titleCase(inventory_item.id.replace("minecraft:", ""));
                let actualItemName = new ItemStack(Items.get(inventory_item.id));
                actualItemName.data = inventory_item.data;
                actualItemName.amount = inventory_item.amount;
                actualItemName.nameTag = newNameTag;

                if (verifiedItemName !== newNameTag) {
                    // Gets enchantment component
                    let ench_comp = inventory_item.getComponent("minecraft:enchantments");
                    // Gets enchantment list from enchantment
                    let ench_data = ench_comp.enchantments;

                    // List of allowed enchantments on item
                    let enchantedSlot = enchantmentSlot[ench_data.slot];
                    // Check if enchantment is not illegal on item
                    if (ench_data) {
                        for (let enchants in MinecraftEnchantmentTypes) {
                            // If no enchantment then move to next loop
                            let enchanted = MinecraftEnchantmentTypes[enchants];
                            if (!ench_data.hasEnchantment(enchanted)) {
                                continue;
                            }
                            // Get properties of this enchantment
                            let enchant_data = ench_data.getEnchantment(MinecraftEnchantmentTypes[enchants]);
                            // Is this item allowed to have this enchantment and does it not exceed level limitations
                            let enchantLevel = enchantedSlot[enchants];
                            if (enchantLevel && enchant_data && enchant_data.level <= enchantLevel && enchant_data.level  >= 0) {
                                // Save this enchantment and level for new item
                                let changeCase = toCamelCase(enchants);
                                enchantArray.push(changeCase);
                                enchantLevelArray.push(enchant_data.level);
                                
                            }
                        }
                    }
                } 

                // Gets enchantment component for new instance
                let new_ench_comp = actualItemName.getComponent("minecraft:enchantments");
                // Gets enchantment list from enchantment of new instance
                let new_ench_data = new_ench_comp.enchantments;

                // Both arrays should be inline with each other so we just use enchantArray here
                // Add enchantment and corresponding level to the item
                for (let e = 0; e < enchantArray.length; e++) {
                    // Adds enchantment to enchantment list of new instance
                    new_ench_data.addEnchantment(new Enchantment(MinecraftEnchantmentTypes[enchantArray[e]], enchantLevelArray[e]));
                    // Sets enchantment list to enchantment of new instance
                    new_ench_comp.enchantments = new_ench_data;
                }
                // Restore enchanted item
                if (!illegalLoresBoolean) {
                    let loreData = inventory_item.getLore();
                    try {
                        inventory.setItem(i, actualItemName.setLore([loreData]));
                    } catch (error) {}
                } else if (illegalLoresBoolean) {
                    try {
                        inventory.setItem(i, actualItemName);
                    } catch (error) {}
                }
                if (config.debug) {
                    console.warn(`${newNameTag} has been set and verified by Paradox (illegalitems/C)!`);
                }
            } else {
                /**
                 * Old salvage system if new is disabled
                 */
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
            }

            // Check if item found inside the container is illegal
            if (illegalitems.includes(inventory_item.id)) {
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                return rip(player, inventory_item, false, false);
            }
            // Check if item found inside container exceeds allowed stacks
            const maxStack = maxItemStack[inventory_item.id] ?? defaultMaxItemStack;
            if (inventory_item.amount < 0 || inventory_item.amount > maxStack) {
                const itemId = inventory_item.id.replace('minecraft:', "");
                // Item stacks over max allowed we remove
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, "Stacks", block.id.replace('minecraft:', ""), false, false);
                sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r detected with stacked items greater than x${maxStack} for '${itemId}'.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Stacked item '${itemId}' cannot exceed x${maxStack}!`);
                if (stackBanBoolean) {
                    return rip(player, inventory_item, false, false);
                }
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch (error) {}
                continue;
            }
            // Check items for illegal lores
            if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(inventory_item.getLore()))) {
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r Removed ${inventory.id.replace("minecraft:", "")} with lore from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
                continue;
            }
            if (illegalEnchantmentBoolean) {
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
                            flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                            // Remove this item immediately
                            try {
                                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                            } catch {}
                            sendMsg('@a[tag=notify]', [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§f${block.id.replace("minecraft:", "")}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, enchant_data, false);
                            break;
                        }
                        // Does the enchantment type exceed or break vanilla levels
                        if (enchant_data && enchant_data.level > enchantLevel || enchant_data && enchant_data.level < 0) {
                            flag(player, "IllegalItems", "C", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                            // Remove this item immediately
                            try {
                                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                            } catch {}
                            sendMsg('@a[tag=notify]', [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§f${block.id.replace("minecraft:", "")}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, enchant_data, false);
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
                sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r ${player.nameTag} placed a nested chest at X=${x.toFixed(0)}, Y=${y.toFixed(0)}, Z=${z.toFixed(0)}. Chest has been cleared!`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Nested chests are not allowed. This chest has been cleared!`);
                // Clear this container from the world
                inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                continue;
            }
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(illegalitemsc);
};

export { IllegalItemsC };
