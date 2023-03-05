import { world, ItemStack, MinecraftItemTypes, Items, MinecraftEnchantmentTypes, Enchantment, Player, EntityInventoryComponent, ItemEnchantsComponent, InventoryComponentContainer, system } from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { crypto, flag, sendMsg, sendMsgToPlayer, titleCase, toCamelCase } from "../../../util.js";
import { enchantmentSlot } from "../../../data/enchantments.js";
import salvageable from "../../../data/salvageable.js";
import { whitelist } from "../../../data/whitelistitems.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;
const emptyItem = new ItemStack(MinecraftItemTypes.acaciaBoat, 0);

const storage = new Map();

function rip(player: Player, inventory_item: ItemStack, enchData: { id: string; level: number }) {
    if (!enchData) {
        // Tag with reason and by who
        try {
            player.addTag(`Reason:Illegal Item A (${inventory_item.typeId.replace("minecraft:", "")}=${inventory_item.amount})`);
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
            player.addTag(`Reason:Illegal Item A (${inventory_item.typeId.replace("minecraft:", "")}: ${enchData.id}=${enchData.level})`);
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
    }
}

function illegalitemsa(id: number) {
    // Get Dynamic Property
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b"),
        salvageBoolean = dynamicPropertyRegistry.get("salvage_b"),
        illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b"),
        illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b"),
        antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b"),
        stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");

    // Unsubscribe if disabled in-game
    if (illegalItemsABoolean === false) {
        const allPlayers = [...World.getPlayers()];
        for (const player of allPlayers) {
            if (player.hasTag("illegalitemsA")) {
                player.removeTag("illegalitemsA");
            }
        }
        system.clearRunSchedule(id);
        return;
    }

    for (const player of World.getPlayers()) {
        if (!player.hasTag("illegalitemsA") && illegalItemsABoolean) {
            player.addTag("illegalitemsA");
        }
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            storage.delete(player);
            continue;
        }

        const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent,
            container = inventory.container;
        storage.set(player, container);
    }
    let player: Player;
    let container: InventoryComponentContainer;
    for ([player, container] of storage.entries()) {
        /**
         * Once we get the player as the key and its relevant value from the map
         * we want to immediately clear that player from the map to prevent any potential errors
         * if they log off later on. A player is never properly cleared from the map
         * when a player logs off so the loop here attempts to target a player that does not
         * exist.
         */
        storage.delete(player);
        let i = container.size;
        while (i--) {
            const inventory_item = container.getItem(i);
            if (!inventory_item) continue;

            const itemType = Items.get(inventory_item.typeId);

            // If player has an illegal item we kick them
            // If we cannot kick them then we despawn them (no mercy)
            if (inventory_item.typeId in illegalitems) {
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.typeId, inventory_item.amount, null, null, false, null);
                try {
                    container.setItem(i, emptyItem);
                } catch {}
                // Ban
                return rip(player, inventory_item, null);
            }
            // If player has illegal stack we clear it and ban if enabled
            const maxStack = maxItemStack[inventory_item.typeId] ?? defaultMaxItemStack;
            if (inventory_item.amount < 0 || inventory_item.amount > maxStack) {
                const itemId = inventory_item.typeId.replace("minecraft:", "");
                // Item stacks over max allowed we clear them
                flag(player, "IllegalItems", "A", "Exploit", inventory_item.typeId, inventory_item.amount, "Stacks", itemId, false, null);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r detected with stacked items greater than x${maxStack} for '${itemId}'.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Stacked item '${itemId}' cannot exceed x${maxStack}!`);
                if (stackBanBoolean) {
                    // Ban
                    return rip(player, inventory_item, null);
                }
                try {
                    container.setItem(i, emptyItem);
                } catch {}
                continue;
            }
            // Check items for illegal lores
            if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(inventory_item.getLore()))) {
                try {
                    container.setItem(i, emptyItem);
                } catch {}
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${inventory_item.typeId.replace("minecraft:", "")} with lore from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
                continue;
            }
            if (illegalEnchantmentBoolean) {
                // We get a list of enchantments on this item
                const enchantContainer = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent,
                    item_enchants = enchantContainer.enchantments,
                    // List of allowed enchantments on item
                    enchantedSlot = enchantmentSlot[item_enchants.slot];
                // Check if enchantment is illegal on item
                if (item_enchants) {
                    for (const {
                        level,
                        type: { id },
                    } of item_enchants) {
                        const enchantLevel = enchantedSlot[id];
                        switch (true) {
                            case !enchantLevel:
                            // Does the enchantment type exceed or break vanilla levels
                            case level > enchantLevel || level < 0: {
                                flag(player, "IllegalItems", "A", "Exploit", inventory_item.typeId, inventory_item.amount, null, null, false, null);
                                // Remove this item immediately
                                try {
                                    container.setItem(i, emptyItem);
                                } catch {}
                                sendMsg("@a[tag=notify]", [
                                    `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.typeId.replace("minecraft:", "")}§4]§r §6Enchanted: §4${id}=${level}§r`,
                                    `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.typeId.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`,
                                ]);
                                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                                rip(player, inventory_item, { id, level });
                                break;
                            }
                        }
                    }
                }
                continue;
            }

            // If shulker boxes are not allowed in the server then we handle this here
            // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
            const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];
            if (antiShulkerBoolean && inventory_item.typeId in shulkerItems) {
                try {
                    container.setItem(i, emptyItem);
                } catch {}
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${inventory_item.typeId.replace("minecraft:", "")} from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
                continue;
            }

            if (itemType && salvageBoolean && inventory_item.typeId in whitelist === false) {
                /**
                 * Salvage System to mitigate NBT's on every item in the game
                 */
                const enchantArray = [],
                    enchantLevelArray = [],
                    verifiedItemName = inventory_item.nameTag,
                    newNameTag = titleCase(inventory_item.typeId.replace("minecraft:", "")),
                    actualItemName = new ItemStack(itemType);
                actualItemName.data = inventory_item.data;
                actualItemName.amount = inventory_item.amount;
                actualItemName.nameTag = newNameTag;

                if (verifiedItemName !== newNameTag) {
                    // Gets enchantment component
                    const ench_comp = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent,
                        // Gets enchantment list from enchantment
                        ench_data = ench_comp.enchantments;
                    // Check if enchantment is not illegal on item
                    if (ench_data) {
                        // List of allowed enchantments on item
                        const enchantedSlot = enchantmentSlot[ench_data.slot];
                        for (const enchants in MinecraftEnchantmentTypes) {
                            // If no enchantment then move to next loop
                            const enchanted = MinecraftEnchantmentTypes[enchants];
                            if (!ench_data.hasEnchantment(enchanted)) continue;
                            // Get properties of this enchantment
                            const enchant_data = ench_data.getEnchantment(MinecraftEnchantmentTypes[enchants]),
                                // Is this item allowed to have this enchantment and does it not exceed level limitations
                                enchantLevel = enchantedSlot[enchants];
                            if (enchantLevel && enchant_data && enchant_data.level <= enchantLevel && enchant_data.level >= 0) {
                                // Save this enchantment and level for new item
                                const changeCase = toCamelCase(enchants);
                                enchantArray.push(changeCase);
                                enchantLevelArray.push(enchant_data.level);
                            }
                        }
                    }

                    // Gets enchantment component for new instance
                    const new_ench_comp = actualItemName.getComponent("minecraft:enchantments") as ItemEnchantsComponent,
                        // Gets enchantment list from enchantment of new instance
                        new_ench_data = new_ench_comp.enchantments;

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
                        const loreData = inventory_item.getLore();
                        try {
                            actualItemName.setLore(loreData);
                            container.setItem(i, actualItemName);
                        } catch {}
                    } else if (illegalLoresBoolean) {
                        try {
                            container.setItem(i, actualItemName);
                        } catch {}
                    }
                    if (config.debug) {
                        console.warn(`${newNameTag} has been set and verified by Paradox (illegalitems/A)!`);
                    }
                }
            } else {
                /**
                 * Old salvage system if new is disabled
                 */
                let loreData: string[],
                    // If player has salvageable item we save it
                    uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
                // Check if data exceeds vanilla data
                if (salvageable[inventory_item.typeId] && uniqueItems.indexOf(salvageable[inventory_item.typeId].name) !== -1 && salvageable[inventory_item.typeId].data < inventory_item.data) {
                    // Reset item to data type of 0
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(itemType, inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    try {
                        container.setItem(i, new ItemStack(itemType, inventory_item.amount));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.typeId] && salvageable[inventory_item.typeId].data !== inventory_item.data && uniqueItems.indexOf(salvageable[inventory_item.typeId].name) === -1) {
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(itemType, inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    // Reset item to data type of equal data if they do not match
                    try {
                        container.setItem(i, new ItemStack(itemType, inventory_item.amount, salvageable[inventory_item.typeId].data));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.typeId]) {
                    if (!illegalLoresBoolean) {
                        loreData = inventory_item.getLore();
                        try {
                            const newItem = new ItemStack(itemType, inventory_item.amount);
                            newItem.setLore(loreData);
                            container.setItem(i, newItem);
                        } catch (error) {}
                        continue;
                    }
                    // Reset item to data type of equal data because we take no chances
                    try {
                        container.setItem(i, new ItemStack(itemType, inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                    continue;
                }
            }
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function IllegalItemsA() {
    const illegalItemsAId = system.runSchedule(() => {
        illegalitemsa(illegalItemsAId);
    });
}
