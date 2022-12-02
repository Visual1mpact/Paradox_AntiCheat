import { world, Player, ItemStack, Items, MinecraftItemTypes, MinecraftEnchantmentTypes, Enchantment, BeforeItemUseOnEvent, EntityInventoryComponent, ItemEnchantsComponent } from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
import { crypto, flag, sendMsg, sendMsgToPlayer, titleCase, toCamelCase } from "../../../util.js";
import config from "../../../data/config.js";
import { enchantmentSlot } from "../../../data/enchantments.js";
import salvageable from "../../../data/salvageable.js";
import { whitelist } from "../../../data/whitelistitems.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";
import { kickablePlayers } from "../../../kickcheck.js";

const World = world;
const emptyItem = new ItemStack(MinecraftItemTypes.acaciaBoat, 0);

function rip(player: Player, inventory_item: ItemStack, enchData: { id: string; level: number }) {
    if (!enchData) {
        // Tag with reason and by who
        try {
            player.addTag(`Reason:Illegal Item B (${inventory_item.id.replace("minecraft:", "")}=${inventory_item.amount})`);
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
    } else {
        // Tag with reason and by who
        try {
            player.addTag(`Reason:Illegal Item B (${inventory_item.id.replace("minecraft:", "")}: ${enchData.id}=${enchData.level})`);
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
    }
}

function illegalitemsb(object: BeforeItemUseOnEvent) {
    // Get Dynamic Property
    let illegalItemsBBoolean = World.getDynamicProperty("illegalitemsb_b");
    if (illegalItemsBBoolean === undefined) illegalItemsBBoolean = config.modules.illegalitemsB.enabled;

    let salvageBoolean = World.getDynamicProperty("salvage_b");
    if (salvageBoolean === undefined) salvageBoolean = config.modules.salvage.enabled;

    let illegalLoresBoolean = World.getDynamicProperty("illegallores_b");
    if (illegalLoresBoolean === undefined) illegalLoresBoolean = config.modules.illegalLores.enabled;

    let illegalEnchantmentBoolean = World.getDynamicProperty("illegalenchantment_b");
    if (illegalEnchantmentBoolean === undefined) illegalEnchantmentBoolean = config.modules.illegalEnchantment.enabled;

    let antiShulkerBoolean = World.getDynamicProperty("antishulker_b");
    if (antiShulkerBoolean === undefined) antiShulkerBoolean = config.modules.antishulker.enabled;

    let stackBanBoolean = World.getDynamicProperty("stackban_b");
    if (stackBanBoolean === undefined) stackBanBoolean = config.modules.stackBan.enabled;

    // Unsubscribe if disabled in-game
    if (illegalItemsBBoolean === false) {
        World.events.beforeItemUseOn.unsubscribe(illegalitemsb);
        return;
    }

    // Properties from class
    let { item, source } = object;

    // Used for getting some info on the item
    if (config.debug) {
        source.runCommandAsync(`say Item: ${item.id}, Data: ${item.data}, Amount: ${item.amount}`);
    }

    // Check for hash/salt and validate password
    let hash = source.getDynamicProperty("hash");
    let salt = source.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player is OP
    if (hash !== undefined && encode === hash) {
        return;
    }

    // Only fire if entity is a Player
    if (!(source instanceof Player)) {
        return;
    }

    let hand = source.selectedSlot;

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];
    if (antiShulkerBoolean && item.id in shulkerItems) {
        object.cancel = true;
        let invContainer = source.getComponent("minecraft:inventory");
        invContainer.container.setItem(hand, emptyItem);
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${item.id.replace("minecraft:", "")} from ${source.nameTag}.`);
        sendMsgToPlayer(source, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
        return;
    }

    const itemType = Items.get(item.id);
    // Check if item is in illegal item list
    if (item.id in illegalitems) {
        object.cancel = true;
        flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, null, null, false, null);
        let invContainer = source.getComponent("minecraft:inventory");
        invContainer.container.setItem(hand, emptyItem);
        // Ban
        return rip(source, item, null);
    }

    // Check if item exceeds allowed stacks then remove and ban if enabled
    const maxStack = maxItemStack[item.id] ?? defaultMaxItemStack;
    if (item.amount < 0 || item.amount > maxStack) {
        const itemId = item.id.replace("minecraft:", "");
        object.cancel = true;
        // Item stacks over max allowed and we remove
        try {
            let invContainer = source.getComponent("minecraft:inventory");
            invContainer.container.setItem(hand, emptyItem);
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${source.nameTag}§r detected with stacked items greater than x${maxStack} for '${itemId}'.`);
            sendMsgToPlayer(source, `§r§4[§6Paradox§4]§r Stacked item '${itemId}' cannot exceed x${maxStack}!`);
        } catch (error) {}
        if (stackBanBoolean) {
            // Ban
            return rip(source, item, null);
        } else {
            return;
        }
    }

    // Check items for illegal lores
    if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(item.getLore()))) {
        object.cancel = true;
        try {
            let invContainer = source.getComponent("minecraft:inventory");
            invContainer.container.setItem(hand, emptyItem);
        } catch {}
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${item.id.replace("minecraft:", "")} with lore from ${source.nameTag}.`);
        sendMsgToPlayer(source, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
        return;
    }

    if (illegalEnchantmentBoolean) {
        // We get a list of enchantments on this item
        let enchantComponent = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
        let item_enchants = enchantComponent.enchantments;
        // List of allowed enchantments on item
        let enchantedSlot = enchantmentSlot[item_enchants.slot];
        // Check if enchantment is illegal on item
        if (item_enchants) {
            for (let {
                level,
                type: { id },
            } of item_enchants) {
                // Is this item allowed to have this enchantment
                let enchantLevel = enchantedSlot[id];
                if (!enchantLevel) {
                    object.cancel = true;
                    flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, null, null, false, null);
                    // Remove this item immediately
                    let invContainer = source.getComponent("minecraft:inventory");
                    invContainer.container.setItem(hand, emptyItem);
                    sendMsg("@a[tag=notify]", [
                        `§r§4[§6Paradox§4]§r §4[§f${source.nameTag}§4]§r §6=>§r §4[§fSlot§4]§r ${hand}§r §6=>§r §4[§f${item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${id}=${level}§r`,
                        `§r§4[§6Paradox§4]§r Removed §4[§f${item.id.replace("minecraft:", "")}§4]§r from ${source.nameTag}.`,
                    ]);
                    sendMsgToPlayer(source, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                    rip(source, item, { id, level });
                    break;
                }
                // Does the enchantment type exceed or break vanilla levels
                if (level > enchantLevel || level < 0) {
                    object.cancel = true;
                    flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, null, null, false, null);
                    // Remove this item immediately
                    let invContainer = source.getComponent("minecraft:inventory");
                    invContainer.container.setItem(hand, emptyItem);
                    sendMsg("@a[tag=notify]", [
                        `§r§4[§6Paradox§4]§r §4[§f${source.nameTag}§4]§r §6=>§r §4[§fSlot§4]§r ${hand}§r §6=>§r §4[§f${item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${id}=${level}§r`,
                        `§r§4[§6Paradox§4]§r Removed §4[§f${item.id.replace("minecraft:", "")}§4]§r from ${source.nameTag}.`,
                    ]);
                    sendMsgToPlayer(source, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                    rip(source, item, { id, level });
                    break;
                }
            }
        }
    }

    if (itemType && salvageBoolean && item.id in whitelist === false) {
        /**
         * Salvage System to mitigate NBT's on every item in the game
         */
        try {
            let enchantArray = [];
            let enchantLevelArray = [];
            let verifiedItemName = item.nameTag;
            let newNameTag = titleCase(item.id.replace("minecraft:", ""));
            let actualItemName = new ItemStack(itemType);
            actualItemName.data = item.data;
            actualItemName.amount = item.amount;
            actualItemName.nameTag = newNameTag;

            if (verifiedItemName !== newNameTag) {
                // Gets enchantment component
                let ench_comp = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
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
                        if (enchantLevel && enchant_data && enchant_data.level <= enchantLevel && enchant_data.level >= 0) {
                            // Save this enchantment and level for new item
                            let changeCase = toCamelCase(enchants);
                            enchantArray.push(changeCase);
                            enchantLevelArray.push(enchant_data.level);
                        }
                    }
                }

                // Gets enchantment component for new instance
                let new_ench_comp = actualItemName.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
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
                    let loreData = item.getLore();
                    try {
                        actualItemName.setLore(loreData);
                        let invContainer = source.getComponent("minecraft:inventory");
                        invContainer.container.setItem(hand, actualItemName);
                    } catch (error) {}
                } else if (illegalLoresBoolean) {
                    try {
                        let invContainer = source.getComponent("minecraft:inventory");
                        invContainer.container.setItem(hand, actualItemName);
                    } catch (error) {}
                }
                if (config.debug) {
                    console.warn(`${newNameTag} has been set and verified by Paradox (illegalitems/B)!`);
                }
            }
        } catch (error) {}
    } else {
        // Used to contain data about Lores
        let loreData;
        // Check if item is salvageable and save it
        let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
        // Check if data exceeds vanilla data
        if (salvageable[item.id] && uniqueItems.indexOf(salvageable[item.id].name) !== -1 && salvageable[item.id].data < item.data) {
            // Reset item to data type of 0
            if (!illegalLoresBoolean) {
                loreData = item.getLore();
                try {
                    const newItem = new ItemStack(itemType, item.amount);
                    newItem.setLore(loreData);
                    let invContainer = source.getComponent("minecraft:inventory");
                    invContainer.container.setItem(hand, newItem);
                } catch (error) {}
                return;
            }
            try {
                let invContainer = source.getComponent("minecraft:inventory");
                invContainer.container.setItem(hand, new ItemStack(itemType, item.amount));
            } catch (error) {}
            return;
        } else if (salvageable[item.id] && salvageable[item.id].data !== item.data && uniqueItems.indexOf(salvageable[item.id].name) === -1) {
            // Reset item to data type of equal data if they do not match
            if (!illegalLoresBoolean) {
                loreData = item.getLore();
                try {
                    const newItem = new ItemStack(itemType, item.amount, salvageable[item.id].data);
                    newItem.setLore(loreData);
                    let invContainer = source.getComponent("minecraft:inventory");
                    invContainer.container.setItem(hand, newItem);
                } catch (error) {}
                return;
            }
            try {
                let invContainer = source.getComponent("minecraft:inventory");
                invContainer.container.setItem(hand, new ItemStack(itemType, item.amount, salvageable[item.id].data));
            } catch (error) {}
            return;
        } else if (salvageable[item.id]) {
            // Reset item to data type of equal data because we take no chances
            if (!illegalLoresBoolean) {
                loreData = item.getLore();
                try {
                    const newItem = new ItemStack(itemType, item.amount, item.data);
                    newItem.setLore(loreData);
                    let invContainer = source.getComponent("minecraft:inventory");
                    invContainer.container.setItem(hand, newItem);
                } catch (error) {}
                return;
            }
            try {
                let invContainer = source.getComponent("minecraft:inventory");
                invContainer.container.setItem(hand, new ItemStack(itemType, item.amount, item.data));
            } catch (error) {}
            return;
        }
    }
}

const IllegalItemsB = () => {
    World.events.beforeItemUseOn.subscribe(illegalitemsb);
};

export { IllegalItemsB };
