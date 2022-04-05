import { world, Player, ItemStack, Items, MinecraftItemTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import salvageable from "../../../data/salvageable.js";
import { disabler, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function illegalitemsb(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsB.enabled === false) {
        World.events.beforeItemUse.unsubscribe(illegalitemsb);
        return;
    }

    // Properties from class
    let { item, source, cancel } = object;

    // Only fire if entity is a Player
    if (!(source instanceof Player)) {
        return;
    }

    let hand = source.selectedSlot
    // If shulker boxes are not allowed in the server then we handle this here
    // No need to ban when we can just remove it entirely and it's not officially listed as an illegal item at this moment
    if (config.modules.antishulker.enabled && item.id === "minecraft:shulker_box" && !source.hasTag('paradoxOpped') || config.modules.antishulker.enabled && item.id === "minecraft:undyed_shulker_box" && !source.hasTag('paradoxOpped')) {
        cancel = true;
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air, 1));
        return;
    }
    // If somehow they bypass illegalitems/A then snag them when they use the item
    if (illegalitems.includes(item.id) && !source.hasTag('paradoxOpped')) {
        flag(source, "IllegalItems", "B", "Exploit", item.id, item.amount, false, false, false, false);
        cancel = true;
        source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(MinecraftItemTypes.air,1 ));
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
            source.runCommand(`tag "${disabler(source.nameTag)}" add "Reason:Illegal Item (${item.id.replace("minecraft:", "")})"`);
            source.runCommand(`tag "${disabler(source.nameTag)}" add "By:Paradox"`);
            source.addTag('isBanned');
        } catch (error) {
            source.triggerEvent('paradox:kick');
        }
    } else if (salvageable[item.id] && !source.hasTag('paradoxOpped')) {
        cancel = true;
        let potions = ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion"];
        // Check if data exceeds vanilla data
        if (potions.indexOf(salvageable[item.id].name) !== -1 && salvageable[item.id].data < item.data) {
            // Reset item to data type of 0
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount));
            } catch (error) {}
        } else if (salvageable[item.id].data !== item.data && potions.indexOf(salvageable[item.id].name) === -1) {
            // Reset item to data type of equal data if they do not match
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount, salvageable[item.id].data));
            } catch (error) {}
        } else {
            // Reset item to data type of equal data because we take no chances
            try {
                source.getComponent('minecraft:inventory').container.setItem(hand, new ItemStack(Items.get(item.id), item.amount, item.data));
            } catch (error) {}
        }
    }
}

const IllegalItemsB = () => {
    World.events.beforeItemUse.subscribe(object => illegalitemsb(object));
};

export { IllegalItemsB };
