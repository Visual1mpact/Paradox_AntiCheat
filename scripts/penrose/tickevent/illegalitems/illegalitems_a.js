import { world, ItemStack, MinecraftItemTypes, Items, MinecraftEnchantmentTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import config from "../../../data/config.js";
import { disabler, flag } from "../../../util.js";
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
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item A (${inventory_item.id.replace("minecraft:", "")}=${inventory_item.amount})"`);
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
        // Return if player has op
        if (player.hasTag('paradoxOpped')){
            break;
        }
        let inventory = player.getComponent('minecraft:inventory').container;
        for (let i = 0; i < inventory.size; i++) {
            let inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            }
            // If shulker boxes are not allowed in the server then we handle this here
            // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
            if (config.modules.antishulker.enabled && inventory_item.id === "minecraft:shulker_box" || config.modules.antishulker.enabled && inventory_item.id === "minecraft:undyed_shulker_box") {
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                try {
                    player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${inventory_item.id.replace("minecraft:", "")} from ${disabler(player.nameTag)}."}]}`);
                } catch (error) {}
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!"}]}`);
                continue;
            }
            // If player has salvageable item we save it
            if (salvageable[inventory_item.id]) {
                let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
                // Check if data exceeds vanilla data
                if (uniqueItems.indexOf(salvageable[inventory_item.id].name) !== -1 && salvageable[inventory_item.id].data < inventory_item.data) {
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
                } else {
                    // Reset item to data type of equal data because we take no chances
                    try {
                        inventory.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                    continue;
                }
            }
            // If player has an illegal item we kick them
            // If we cannot kick them then we despawn them (no mercy)
            if (illegalitems.includes(inventory_item.id)) {
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, false, false, false, false);
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                // Ban
                return rip(player, inventory_item);
            }
            // If player has illegal stack we clear it and ban if enabled
            if (inventory_item.amount > config.modules.illegalitemsA.maxStack) {
                // Item stacks over 64 we clear them
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, "Stacks", inventory_item.id.replace('minecraft:', ""), false, false);
                // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                try {
                    player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(player.nameTag)} detected with stacked items greater than x64."}]}`);
                } catch (error) {}
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Stacked items cannot exceed x64!"}]}`);
                if (config.modules.stackBan.enabled) {
                    // Ban
                    return rip(player, inventory_item);
                }
                try {
                    inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
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
                                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4[§f${disabler(player.nameTag)}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r"}]}`);
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
                                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4[§f${disabler(player.nameTag)}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r"}]}`);
                                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${disabler(player.nameTag)}."}]}`);
                            } catch (error) {}
                            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!"}]}`);
                            break;
                        }
                    }
                }
                continue;
            }
        }
    }
    return;
}

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => illegalitemsa());
};

export { IllegalItemsA };