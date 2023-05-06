import { world, ItemStack, Player, EntityInventoryComponent, system, ItemEnchantsComponent, EnchantmentList, EnchantmentType, Enchantment } from "@minecraft/server";
import config from "../../../data/config.js";
import { illegalitems } from "../../../data/itemban.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

function rip(player: Player, inventory_item: ItemStack, enchData?: { id: string; level: number }, lore = false) {
    let reason: string;
    if (enchData) {
        const { id, level } = enchData;
        reason = `Illegal Item A (${inventory_item.typeId.replace("minecraft:", "")}: ${id}=${level})`;
    } else {
        reason = `Illegal Item A (${inventory_item.typeId.replace("minecraft:", "")}=${inventory_item.amount})`;
        if (lore) {
            reason += " (Lore)";
        }
    }

    try {
        player.addTag(`Reason:${reason}`);
        player.addTag("By:Paradox");
        player.addTag("isBanned");
    } catch (error) {
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

function illegalitemsa(id: number) {
    // Get Dynamic Property
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");
    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b");
    /*
        salvageBoolean = dynamicPropertyRegistry.get("salvage_b"),
    */

    // Unsubscribe if disabled in-game
    if (illegalItemsABoolean === false) {
        const allPlayers = [...world.getPlayers()];
        for (const player of allPlayers) {
            if (player.hasTag("illegalitemsA")) {
                player.removeTag("illegalitemsA");
            }
        }
        system.clearRun(id);
        return;
    }

    // Retrieve all players with the "illegalitemsA" tag from the "world" object
    const allFilteredPlayers = world.getPlayers({ tags: ["illegalitemsA"] });

    // Iterate through each player
    for (const player of allFilteredPlayers) {
        // Get the player's unique ID from the "dynamicPropertyRegistry" object
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // If the player has permission (i.e., their unique ID matches their name), skip to the next player
        if (uniqueId === player.name) {
            continue;
        }

        // Get the player's inventory and container size
        const playerInventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
        const playerContainer = playerInventory.container;
        const playerContainerSize = playerContainer.size;

        // Create a map of enchantment types and their presence in the player's inventory
        const enchantmentPresenceMap = new Map<Enchantment, boolean>();
        // Create a map of enchantment types and their data in the player's inventory
        const enchantmentDataMap = new Map<Enchantment, EnchantmentList>();
        // Create a map of enchantment types and a number type to signify slot value
        const inventorySlotMap = new Map<Enchantment, number>();

        // Iterate through each slot in the player's container
        for (let i = 0; i < playerContainerSize; i++) {
            let itemFlagged = false;

            // Get the item in the current slot
            const playerItemStack = playerContainer.getItem(i);
            const itemStackId = playerItemStack?.typeId;
            if (!itemStackId) {
                continue;
            }

            // Anti Shulker Boxes
            if (antiShulkerBoolean && itemStackId.includes("shulker")) {
                playerContainer.setItem(i);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${itemStackId.replace("minecraft:", "")} from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Shulker Boxes are not allowed!`);
                continue;
            }

            // Illegal Stacks
            const currentStack = playerItemStack.amount;
            const maxStack = playerItemStack.maxAmount;
            if (stackBanBoolean && currentStack > maxStack) {
                playerContainer.setItem(i);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${itemStackId.replace("minecraft:", "")} x ${currentStack} from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal Stacks are not allowed!`);
                rip(player, playerItemStack);
                break;
            }

            // If the item is in the "illegalitems" object, remove it from the player's inventory and run the "rip" function on it
            if (itemStackId in illegalitems) {
                itemFlagged = true;
                playerContainer.setItem(i);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${itemStackId.replace("minecraft:", "")} from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Illegal Items are not allowed!`);
                rip(player, playerItemStack);
                break;
            }

            // Illegal Lores
            if (illegalLoresBoolean && !config.modules.illegalLores.exclude.includes(String(playerItemStack.getLore()))) {
                playerContainer.setItem(i);
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${itemStackId.replace("minecraft:", "")} with lore from ${player.nameTag}.`);
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal lores are not allowed!`);
                rip(player, playerItemStack, null, true);
                break;
            }

            // Illegal Enchantments
            if (!itemFlagged && illegalEnchantmentBoolean) {
                const enchantmentComponent = playerItemStack.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
                const enchantmentData = enchantmentComponent.enchantments;

                // Update the enchantment presence and data maps for each enchantment type
                const iterator = enchantmentData[Symbol.iterator]();
                let iteratorResult = iterator.next();
                while (!iteratorResult.done) {
                    const enchantment: Enchantment = iteratorResult.value;
                    enchantmentPresenceMap.set(enchantment, true);
                    enchantmentDataMap.set(enchantment, enchantmentData);
                    inventorySlotMap.set(enchantment, i);
                    iteratorResult = iterator.next();
                }
            }
        }

        // Iterate through the enchantment presence map to perform any necessary operations
        if (illegalEnchantmentBoolean) {
            for (const [enchantment, present] of enchantmentPresenceMap) {
                if (present) {
                    // Do something with the present enchantment and its data
                    const enchantmentData = enchantmentDataMap.get(enchantment);
                    const getEnchantment = enchantmentData.getEnchantment(enchantment.type);
                    const currentLevel = getEnchantment.level;
                    const maxLevel = getEnchantment.type.maxLevel;
                    if (currentLevel > maxLevel || currentLevel < 0) {
                        const itemSlot = inventorySlotMap.get(enchantment);
                        const enchData = {
                            id: getEnchantment.type.id,
                            level: currentLevel,
                        };
                        const itemStackId = playerContainer.getItem(itemSlot);
                        playerContainer.setItem(itemSlot);
                        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r Removed ${itemStackId.typeId.replace("minecraft:", "")} with Illegal Enchantments from ${player.nameTag}.`);
                        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Item with illegal Enchantments are not allowed!`);
                        enchantmentPresenceMap.delete(enchantment);
                        enchantmentDataMap.delete(enchantment);
                        inventorySlotMap.delete(enchantment);
                        rip(player, itemStackId, enchData);
                        break;
                    }
                }
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function IllegalItemsA() {
    const illegalItemsAId = system.runInterval(() => {
        illegalitemsa(illegalItemsAId);
    });
}
