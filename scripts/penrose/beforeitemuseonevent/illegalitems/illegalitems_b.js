import { world, Player, ItemStack, Items, MinecraftItemTypes, MinecraftEnchantmentTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import { crypto, disabler, flag, titleCase } from "../../../util.js";
import config from "../../../data/config.js";
import { enchantmentSlot } from "../../../data/enchantments.js";

const World = world;

function rip(source, item) {
    let tags = source.getTags();

    // This removes old ban tags
    tags.forEach(t => {
        if(t.startsWith("Reason:")) {
            source.removeTag(t);
        }
        if(t.startsWith("By:")) {
            source.removeTag(t);
        }
    });
    try {
        source.runCommand(`tag "${disabler(source.nameTag)}" add "Reason:Illegal Item B (${item.id.replace("minecraft:", "")}=${item.amount})"`);
        source.runCommand(`tag "${disabler(source.nameTag)}" add "By:Paradox"`);
        source.addTag('isBanned');
    } catch (error) {
        source.triggerEvent('paradox:kick');
    }
}

function illegalitemsb(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsB.enabled === false) {
        World.events.beforeItemUseOn.unsubscribe(illegalitemsb);
        return;
    }

    // Properties from class
    let { item, source, cancel } = object;

    // Return if player is OP
    if (source.hasTag('Hash:' + crypto)) {
        return;
    }

    // Only fire if entity is a Player
    if (!(source instanceof Player)) {
        return;
    }

    // Used for getting some info on the item
    if (config.debug) {
        console.log(`Player: ${source.name} Item: ${item.id || '(none)'}, Data: ${item.data ?? 0}, Amount: ${item.amount ?? 0}`)
    }

    let hand = source.selectedSlot

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (config.modules.antishulker.enabled && item.id === "minecraft:shulker_box" || config.modules.antishulker.enabled && item.id === "minecraft:undyed_shulker_box") {
        cancel = true;
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${item.id.replace("minecraft:", "")} from ${disabler(source.nameTag)}."}]}`);
        } catch (error) {}
        source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!"}]}`);
        return;
    }

    /**
     * Salvage System to mitigate NBT's on every item in the game
     */
    try {
        let verifiedItemName = item.nameTag;
        let actualItemName = new ItemStack(Items.get(item.id));
        actualItemName.data = item.data;
        actualItemName.amount = item.amount;

        let newNameTag = titleCase(item.id.replace("minecraft:", ""));

        if (verifiedItemName !== newNameTag) {
            actualItemName.nameTag = newNameTag;
            if (!config.modules.illegalLores.enabled) {
                let loreData = item.getLore();
                try {
                    source.getComponent('minecraft:inventory').container.setItem(hand, actualItemName.setLore([loreData]));
                } catch (error) {}
            } else if (config.modules.illegalLores.enabled) {
                try {
                    source.getComponent('minecraft:inventory').container.setItem(hand, actualItemName);
                } catch (error) {}
            }
            if (config.debug) {
                console.warn(`${newNameTag} has been set and verified by Paradox!`);
            }
        }
    } catch (error) {}

    // If somehow they bypass illegalitems/A then snag them when they use the item
    if (illegalitems.includes(item.id)) {
        cancel = true;
        flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, false, false, false, false);
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
        // Ban
        return rip(source, item);
    }
    // Check if item exceeds allowed stacks then remove and ban if enabled
    if (item.amount > config.modules.illegalitemsB.maxStack) {
        cancel = true;
        // Item stacks over 64 we remove
        try {
            source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
            source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(source.nameTag)} detected with stacked items greater than x64."}]}`);
            source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Stacked items cannot exceed x64!"}]}`);
        } catch (error) {}
        if (config.modules.stackBan.enabled) {
            // Ban
            return rip(source, item);
        } else {
            return;
        }
    }
    // Check items for illegal lores
    if (config.modules.illegalLores.enabled && !config.modules.illegalLores.exclude.includes(String(item.getLore()))) {
        cancel = true;
        try {
            source.getComponent('minecraft:inventory').container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
        } catch {}
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${item.id.replace("minecraft:", "")} with lore from ${disabler(source.nameTag)}."}]}`);
        } catch (error) {}
        source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Items with illegal Lores are not allowed!"}]}`);
        return;
    }
    if (config.modules.illegalEnchantment.enabled) {
        // We get a list of enchantments on this item
        let item_enchants = item.getComponent("minecraft:enchantments").enchantments;
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
                    cancel = true;
                    // Remove this item immediately
                    source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
                    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                    try {
                        source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4[§f${disabler(source.nameTag)}§4]§r §6=>§r §4[§fSlot§4]§r ${hand}§r §6=>§r §4[§f${item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r"}]}`);
                        source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed §4[§f${item.id.replace("minecraft:", "")}§4]§r from ${disabler(source.nameTag)}."}]}`);
                    } catch (error) {}
                    source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!"}]}`);
                    break;
                }
                // Does the enchantment type exceed or break vanilla levels
                if (enchant_data && enchant_data.level > enchantLevel || enchant_data && enchant_data.level < 0) {
                    cancel = true;
                    // Remove this item immediately
                    source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
                    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
                    try {
                        source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4[§f${disabler(source.nameTag)}§4]§r §6=>§r §4[§fSlot§4]§r ${hand}§r §6=>§r §4[§f${item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${enchant_data.type.id}=${enchant_data.level}§r"}]}`);
                        source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed §4[§f${item.id.replace("minecraft:", "")}§4]§r from ${disabler(source.nameTag)}."}]}`);
                    } catch (error) {}
                    source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!"}]}`);
                    break;
                }
            }
        }
    }
}

const IllegalItemsB = () => {
    World.events.beforeItemUseOn.subscribe(object => illegalitemsb(object));
};

export { IllegalItemsB };
