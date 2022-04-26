import { world, Player, ItemStack, Items, MinecraftItemTypes, MinecraftEnchantmentTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import { disabler, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { enchantmentSlot } from "../../../data/enchantments.js";

const World = world;

function illegalitemsb(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsB.enabled === false) {
        World.events.beforeItemUseOn.unsubscribe(illegalitemsb);
        return;
    }

    // Properties from class
    let { item, source } = object;

    // Return if player is OP
    if (source.hasTag('paradoxOpped')) {
        return;
    }

    // Only fire if entity is a Player
    if (!(source instanceof Player)) {
        return;
    }

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

    // Used for getting some info on the item
    if (config.debug) {
        source.runCommand(`say Item: ${item.id}, Data: ${item.data}, Amount: ${item.amount}`)
    }

    let hand = source.selectedSlot

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (config.modules.antishulker.enabled && item.id === "minecraft:shulker_box" || config.modules.antishulker.enabled && item.id === "minecraft:undyed_shulker_box") {
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            source.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Removed ${item.id.replace("minecraft:", "")} from ${disabler(source.nameTag)}."}]}`);
        } catch (error) {}
        source.runCommand(`tellraw "${disabler(source.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!"}]}`);
        return;
    }
    // Check if item is salvageable and save it
    if (salvageable[item.id]) {
        let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
        // Check if data exceeds vanilla data
        if (uniqueItems.indexOf(salvageable[item.id].name) !== -1 && salvageable[item.id].data < item.data) {
            // Reset item to data type of 0
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount));
            } catch (error) {}
            return;
        } else if (salvageable[item.id].data !== item.data && uniqueItems.indexOf(salvageable[item.id].name) === -1) {
            // Reset item to data type of equal data if they do not match
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount, salvageable[item.id].data));
            } catch (error) {}
            return;
        } else {
            // Reset item to data type of equal data because we take no chances
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount, item.data));
            } catch (error) {}
            return;
        }
    }
    // If somehow they bypass illegalitems/A then snag them when they use the item
    if (illegalitems.includes(item.id)) {
        flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, false, false, false, false);
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 0));
        // Ban
        return rip(source, item);
    }
    // Check if item exceeds allowed stacks then remove and ban if enabled
    if (item.amount > config.modules.illegalitemsB.maxStack) {
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
    if (config.modules.illegalEnchantment.enabled && !config.modules.illegalEnchantment.exclude.includes(String(item.getLore()))) {
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
