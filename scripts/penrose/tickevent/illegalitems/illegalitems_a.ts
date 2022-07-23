import { world, ItemStack, MinecraftItemTypes, Items, MinecraftEnchantmentTypes, Enchantment, Player, EntityInventoryComponent, ItemEnchantsComponent } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { crypto, flag, sendMsg, sendMsgToPlayer, titleCase, toCamelCase } from "../../../util.js";
import { enchantmentSlot } from "../../../data/enchantments.js";
import salvageable from "../../../data/salvageable.js";
import { whitelist } from "../../../data/whitelistitems.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";

const World = world;

function rip(player: Player, inventory_item: ItemStack, enchData: { id: string; level: number }) {
    // Get all tags
    let tags = player.getTags();

    // This removes old ban tags
    tags.forEach((t) => {
        if (t.startsWith("Reason:")) {
            player.removeTag(t);
        }
        if (t.startsWith("By:")) {
            player.removeTag(t);
        }
    });
    // If enchanted then show it otherwise ignore
    if (!enchData) {
        // Tag with reason and by who
        try {
            player.addTag("Reason:Illegal Item A (" + inventory_item.id.replace("minecraft:", "") + "=" + inventory_item.amount + ")");
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            player.triggerEvent("paradox:kick");
        }
    } else {
        // Tag with reason and by who
        try {
            player.addTag("Reason:Illegal Item A (" + inventory_item.id.replace("minecraft:", "") + ": " + enchData.id + "=" + enchData.level + ")");
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            player.triggerEvent("paradox:kick");
        }
    }
}

function illegalitemsa() {
    // Get Dynamic Property
    let illegalItemsABoolean = World.getDynamicProperty("illegalitemsa_b");
    if (illegalItemsABoolean === undefined) {
        illegalItemsABoolean = config.modules.illegalitemsA.enabled;
    }
    let salvageBoolean = World.getDynamicProperty("salvage_b");
    if (salvageBoolean === undefined) {
        salvageBoolean = config.modules.salvage.enabled;
    }
    let illegalLoresBoolean = World.getDynamicProperty("illegallores_b");
    if (illegalLoresBoolean === undefined) {
        illegalLoresBoolean = config.modules.illegalLores.enabled;
    }
    let illegalEnchantmentBoolean = World.getDynamicProperty("illegalenchantment_b");
    if (illegalEnchantmentBoolean === undefined) {
        illegalEnchantmentBoolean = config.modules.illegalEnchantment.enabled;
    }
    let antiShulkerBoolean = World.getDynamicProperty("antishulker_b");
    if (antiShulkerBoolean === undefined) {
        antiShulkerBoolean = config.modules.antishulker.enabled;
    }
    let stackBanBoolean = World.getDynamicProperty("stackban_b");
    if (stackBanBoolean === undefined) {
        stackBanBoolean = config.modules.stackBan.enabled;
    }

    // Unsubscribe if disabled in-game
    if (illegalItemsABoolean === false) {
        let allPlayers = [...World.getPlayers()];
        for (let player of allPlayers) {
            if (player.hasTag("illegalitemsA")) {
                player.removeTag("illegalitemsA");
            }
        }
        World.events.tick.unsubscribe(illegalitemsa);
        return;
    }

    for (let player of World.getPlayers()) {
        if (!player.hasTag("illegalitemsA") && illegalItemsABoolean) {
            player.addTag("illegalitemsA");
        }
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        let inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
        let container = inventory.container;
        for (let i = 0; i < container.size; i++) {
            let inventory_item = container.getItem(i);
            if (!inventory_item) {
                continue;
            }
            // If shulker boxes are not allowed in the server then we handle this here
            // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
            const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];
            if (antiShulkerBoolean && inventory_item.id in shulkerItems) {
                try {
                    container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${inventory_item.id.replace("minecraft:", "")} from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
                continue;
            }

            if (salvageBoolean && inventory_item.id in whitelist === false) {
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
                    let ench_comp = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
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
                        let loreData = inventory_item.getLore();
                        try {
                            actualItemName.setLore(loreData);
                            container.setItem(i, actualItemName);
                        } catch (error) {}
                    } else if (illegalLoresBoolean) {
                        try {
                            container.setItem(i, actualItemName);
                        } catch (error) {}
                    }
                    if (config.debug) {
                        console.warn(`${newNameTag} has been set and verified by Paradox (illegalitems/A)!`);
                    }
                }
            } else {
                /**
                 * Old salvage system if new is disabled
                 */
                let loreData: string[];
                // If player has salvageable item we save it
                let uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
                // Check if data exceeds vanilla data
                if (salvageable[inventory_item.id] && uniqueItems.indexOf(salvageable[inventory_item.id].name) !== -1 && salvageable[inventory_item.id].data < inventory_item.data) {
                    // Reset item to data type of 0
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(Items.get(inventory_item.id), inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    try {
                        container.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.id] && salvageable[inventory_item.id].data !== inventory_item.data && uniqueItems.indexOf(salvageable[inventory_item.id].name) === -1) {
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(Items.get(inventory_item.id), inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    // Reset item to data type of equal data if they do not match
                    try {
                        container.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, salvageable[inventory_item.id].data));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.id]) {
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(Items.get(inventory_item.id), inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    // Reset item to data type of equal data because we take no chances
                    try {
                        container.setItem(i, new ItemStack(Items.get(inventory_item.id), inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                    continue;
                }
            }

            // If player has an illegal item we kick them
            // If we cannot kick them then we despawn them (no mercy)
            if (inventory_item.id in illegalitems) {
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, null, null, false, null);
                try {
                    container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                // Ban
                return rip(player, inventory_item, null);
            }
            // If player has illegal stack we clear it and ban if enabled
            const maxStack = maxItemStack[inventory_item.id] ?? defaultMaxItemStack;
            if (inventory_item.amount < 0 || inventory_item.amount > maxStack) {
                const itemId = inventory_item.id.replace("minecraft:", "");
                // Item stacks over max allowed we clear them
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, "Stacks", itemId, false, null);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r detected with stacked items greater than x${maxStack} for '${itemId}'.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Stacked item '${itemId}' cannot exceed x${maxStack}!`);
                if (stackBanBoolean) {
                    // Ban
                    return rip(player, inventory_item, null);
                }
                try {
                    container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                continue;
            }
            // Check items for illegal lores
            if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(inventory_item.getLore()))) {
                try {
                    container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                } catch {}
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${inventory_item.id.replace("minecraft:", "")} with lore from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
                continue;
            }
            if (illegalEnchantmentBoolean) {
                // We get a list of enchantments on this item
                let enchantContainer = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                let item_enchants = enchantContainer.enchantments;
                // List of allowed enchantments on item
                let enchantedSlot = enchantmentSlot[item_enchants.slot];
                // Check if enchantment is illegal on item
                if (item_enchants) {
                    for (let {
                        level,
                        type: { id },
                    } of item_enchants) {
                        let enchantLevel = enchantedSlot[id];
                        if (!enchantLevel) {
                            flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, null, null, false, null);
                            // Remove this item immediately
                            try {
                                container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                            } catch {}
                            sendMsg("@a[tag=notify]", [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${id}=${level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`,
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, { id, level });
                            break;
                        }
                        // Does the enchantment type exceed or break vanilla levels
                        if (level > enchantLevel || level < 0) {
                            flag(player, "IllegalItems", "A", "Exploit", inventory_item.id, inventory_item.amount, null, null, false, null);
                            // Remove this item immediately
                            try {
                                container.setItem(i, new ItemStack(MinecraftItemTypes.air, 0));
                            } catch {}
                            sendMsg("@a[tag=notify]", [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r §6Enchanted: §4${id}=${level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.id.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`,
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, { id, level });
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
    World.events.tick.subscribe(illegalitemsa);
};

export { IllegalItemsA };
