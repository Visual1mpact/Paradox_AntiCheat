import {
    world,
    BlockLocation,
    MinecraftItemTypes,
    ItemStack,
    Items,
    MinecraftEnchantmentTypes,
    BlockProperties,
    Enchantment,
    Player,
    Block,
    BlockPlaceEvent,
    BlockInventoryComponent,
    BlockInventoryComponentContainer,
    ItemEnchantsComponent,
    CommandResult,
} from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag, toCamelCase, crypto, titleCase, sendMsgToPlayer, sendMsg } from "../../../util.js";
import { enchantmentSlot } from "../../../data/enchantments.js";
import salvageable from "../../../data/salvageable.js";
import { whitelist } from "../../../data/whitelistitems.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";
import { iicWhitelist } from "../../../data/illegalitemsc_whitelist.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;
const emptyItem = new ItemStack(MinecraftItemTypes.acaciaBoat, 0);

function rip(player: Player, inventory_item: ItemStack, enchData: { id: string; level: number }, block: Block) {
    if (!enchData && !block) {
        // Tag with reason and by who
        try {
            player.addTag(`Reason:Illegal Item C (${inventory_item.typeId.replace("minecraft:", "")}=${inventory_item.amount})`);
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
    } else if (!block) {
        // Tag with reason and by who
        try {
            player.addTag(`Reason:Illegal Item C (${inventory_item.typeId.replace("minecraft:", "")}: ${enchData.id}=${enchData.level})`);
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
            player.addTag(`Reason:Illegal Item C (${block.type.id.replace("minecraft:", "")})`);
            player.addTag("By:Paradox");
            player.addTag("isBanned");
            // Despawn if we cannot kick the player
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
    }
}

async function illegalitemsc(object: BlockPlaceEvent) {
    // Get Dynamic Property
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
    const salvageBoolean = dynamicPropertyRegistry.get("salvage_b");
    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b");
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");

    // Unsubscribe if disabled in-game
    if (illegalItemsCBoolean === false) {
        World.events.blockPlace.unsubscribe(illegalitemsc);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;
    // Block coordinates
    const { x, y, z } = block.location;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];
    if (antiShulkerBoolean && block.typeId in shulkerItems) {
        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${block.typeId.replace("minecraft:", "")} from ${player.nameTag}.`);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            await player.runCommandAsync(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        return;
    }
    const ignoreContainerPlace = ["minecraft:chest", "minecraft:trapped_chest"];
    // Check if place item is salvageable
    if (salvageable[block.typeId] && block.typeId in ignoreContainerPlace === false) {
        // Block from specified location
        const blockLoc = dimension.getBlock(new BlockLocation(x, y, z));
        // Get a copy of this blocks permutation
        const blockPerm = blockLoc.permutation;
        // Get the direction property
        blockPerm.getProperty(BlockProperties.direction);
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        await player.runCommandAsync(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace ${block.typeId} 0`);
        // Update block with modified permutation to correct its direction
        blockLoc.setPermutation(blockPerm);
    }
    // Check if place item is illegal
    if (block.typeId in illegalitems && block.typeId in iicWhitelist === false) {
        // Set block in world
        block.setType(block.type);
        // replace block in world since destroying would drop item entities
        // dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air); //<-- This destroys
        try {
            await player.runCommandAsync(`fill ${x} ${y} ${z} ${x} ${y} ${z} air 0 replace air 0`);
        } catch (error) {}
        flag(player, "IllegalItems", "C", "Exploit", null, null, null, null, null, null);
        return rip(player, null, null, block);
    }
    // Check if placed item has a inventory container
    let inventory: BlockInventoryComponentContainer;
    try {
        const invComponent = block.getComponent("inventory") as BlockInventoryComponent;
        inventory = invComponent.container;
    } catch (error) {}
    if (inventory) {
        for (let i = 0; i < inventory.size; i++) {
            const inventory_item = inventory.getItem(i);
            if (!inventory_item) {
                continue;
            }

            const itemType = Items.get(inventory_item.typeId);

            // Check if item found inside the container is illegal
            if (inventory_item.typeId in illegalitems) {
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.typeId, inventory_item.amount, null, null, false, null);
                inventory.setItem(i, emptyItem);
                return rip(player, inventory_item, null, null);
            }
            // Check if item found inside container exceeds allowed stacks
            const maxStack = maxItemStack[inventory_item.typeId] ?? defaultMaxItemStack;
            if (inventory_item.amount < 0 || inventory_item.amount > maxStack) {
                const itemId = inventory_item.typeId.replace("minecraft:", "");
                // Item stacks over max allowed we remove
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.typeId, inventory_item.amount, "Stacks", block.type.id.replace("minecraft:", ""), false, null);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r detected with stacked items greater than x${maxStack} for '${itemId}'.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Stacked item '${itemId}' cannot exceed x${maxStack}!`);
                if (stackBanBoolean) {
                    return rip(player, inventory_item, null, null);
                }
                try {
                    inventory.setItem(i, emptyItem);
                } catch (error) {}
                continue;
            }
            // Check items for illegal lores
            if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(inventory_item.getLore()))) {
                try {
                    inventory.setItem(i, emptyItem);
                } catch {}
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${block.type.id.replace("minecraft:", "")} with lore from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
                continue;
            }
            if (illegalEnchantmentBoolean) {
                // We get a list of enchantments on this item
                const enchantComponent = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                const item_enchants = enchantComponent.enchantments;
                // List of allowed enchantments on item
                const enchantedSlot = enchantmentSlot[item_enchants.slot];
                // Check if enchantment is illegal on item
                if (item_enchants) {
                    for (const {
                        level,
                        type: { id },
                    } of item_enchants) {
                        const enchantLevel = enchantedSlot[id];
                        if (!enchantLevel) {
                            flag(player, "IllegalItems", "C", "Exploit", inventory_item.typeId, inventory_item.amount, null, null, false, null);
                            // Remove this item immediately
                            try {
                                inventory.setItem(i, emptyItem);
                            } catch {}
                            sendMsg("@a[tag=notify]", [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§f${block.type.id.replace("minecraft:", "")}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.typeId.replace(
                                    "minecraft:",
                                    ""
                                )}§4]§r §6Enchanted: §4${id}=${level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.typeId.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`,
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, { id, level }, null);
                            break;
                        }
                        // Does the enchantment type exceed or break vanilla levels
                        if (level > enchantLevel || level < 0) {
                            flag(player, "IllegalItems", "C", "Exploit", inventory_item.typeId, inventory_item.amount, null, null, false, null);
                            // Remove this item immediately
                            try {
                                inventory.setItem(i, emptyItem);
                            } catch {}
                            sendMsg("@a[tag=notify]", [
                                `§r§4[§6Paradox§4]§r §4[§f${player.nameTag}§4]§r §6=>§r §4[§f${block.type.id.replace("minecraft:", "")}§4]§r §6=>§r §4[§fSlot§4]§r ${i}§r §6=>§r §4[§f${inventory_item.typeId.replace(
                                    "minecraft:",
                                    ""
                                )}§4]§r §6Enchanted: §4${id}=${level}§r`,
                                `§r§4[§6Paradox§4]§r Removed §4[§f${inventory_item.typeId.replace("minecraft:", "")}§4]§r from ${player.nameTag}.`,
                            ]);
                            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal enchantments are not allowed!`);
                            rip(player, inventory_item, { id, level }, null);
                            break;
                        }
                    }
                    continue;
                }
            }
            // Check if item container is not empty
            const whitelistChest = ["minecraft:shulker_box", "minecraft:undyed_shulker_box", "minecraft:ender_chest"];
            if (block.typeId in whitelistChest) {
                // Most items with a container should be empty when placing down
                // If we detect items in the container when being placed then it is a hack
                flag(player, "IllegalItems", "C", "Exploit", inventory_item.typeId, inventory_item.amount, "Container", block.type.id.replace("minecraft:", ""), false, null);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} placed a nested chest at X=${x.toFixed(0)}, Y=${y.toFixed(0)}, Z=${z.toFixed(0)}. Chest has been cleared!`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Nested chests are not allowed. This chest has been cleared!`);
                // Clear this container from the world
                inventory.setItem(i, emptyItem);
                continue;
            }

            if (itemType && salvageBoolean && inventory_item.typeId in whitelist === false) {
                /**
                 * Salvage System to mitigate NBT's on every item in the game
                 */
                const enchantArray = [];
                const enchantLevelArray = [];
                const verifiedItemName = inventory_item.nameTag;
                const newNameTag = titleCase(inventory_item.typeId.replace("minecraft:", ""));
                const actualItemName = new ItemStack(itemType);
                actualItemName.data = inventory_item.data;
                actualItemName.amount = inventory_item.amount;
                actualItemName.nameTag = newNameTag;

                if (verifiedItemName !== newNameTag) {
                    // Gets enchantment component
                    const ench_comp = inventory_item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                    // Gets enchantment list from enchantment
                    const ench_data = ench_comp.enchantments;

                    // List of allowed enchantments on item
                    const enchantedSlot = enchantmentSlot[ench_data.slot];
                    // Check if enchantment is not illegal on item
                    if (ench_data) {
                        for (const enchants in MinecraftEnchantmentTypes) {
                            // If no enchantment then move to next loop
                            const enchanted = MinecraftEnchantmentTypes[enchants];
                            if (!ench_data.hasEnchantment(enchanted)) {
                                continue;
                            }
                            // Get properties of this enchantment
                            const enchant_data = ench_data.getEnchantment(MinecraftEnchantmentTypes[enchants]);
                            // Is this item allowed to have this enchantment and does it not exceed level limitations
                            const enchantLevel = enchantedSlot[enchants];
                            if (enchantLevel && enchant_data && enchant_data.level <= enchantLevel && enchant_data.level >= 0) {
                                // Save this enchantment and level for new item
                                const changeCase = toCamelCase(enchants);
                                enchantArray.push(changeCase);
                                enchantLevelArray.push(enchant_data.level);
                            }
                        }
                    }
                }

                // Gets enchantment component for new instance
                const new_ench_comp = actualItemName.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                // Gets enchantment list from enchantment of new instance
                const new_ench_data = new_ench_comp.enchantments;

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
                        inventory.setItem(i, actualItemName);
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
                const uniqueItems = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:skull"];
                // Check if data exceeds vanilla data
                if (salvageable[inventory_item.typeId] && uniqueItems.indexOf(salvageable[inventory_item.typeId].name) !== -1 && salvageable[inventory_item.typeId].data < inventory_item.data) {
                    // Reset item to data type of 0
                    try {
                        inventory.setItem(i, new ItemStack(itemType, inventory_item.amount));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.typeId].data !== inventory_item.data && uniqueItems.indexOf(salvageable[inventory_item.typeId].name) === -1) {
                    // Reset item to data type of equal data if they do not match
                    try {
                        inventory.setItem(i, new ItemStack(itemType, inventory_item.amount, salvageable[inventory_item.typeId].data));
                    } catch (error) {}
                    continue;
                } else if (salvageable[inventory_item.typeId]) {
                    // Reset item to data type of equal data because we take no chances
                    try {
                        inventory.setItem(i, new ItemStack(itemType, inventory_item.amount, inventory_item.data));
                    } catch (error) {}
                    continue;
                }
            }
        }
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(illegalitemsc);
};

export { IllegalItemsC };
