import config from "../../../data/config.js";
import { world, EntityQueryOptions, ItemStack, EntityItemComponent } from "mojang-minecraft";
import { sendMsg } from "../../../util.js";
import { clearTickInterval, setTickInterval } from "../../../misc/scheduling.js";
import { clearItems } from "../../../data/clearlag.js";

const World = world;

let cooldownTimer = new WeakMap();
// Just a dummy object to use with set/get
let object = { "cooldown": "String" };

function dhms(ms: number) {
    const minutesms = ms % (60 * 1000);
    const sec = Math.floor(minutesms / 1000);
    return sec;
}

function executionItem() {
    // Find them all and take them out
    let filter = new EntityQueryOptions();
    filter.type = "item";
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        let itemName: ItemStack;
        // Get component of itemStack for dropped item
        try {
            let itemContainer = entity.getComponent('item') as unknown as EntityItemComponent;
            itemName = itemContainer.itemStack;
        } catch (error) { }
        // Kill dropped items
        if (clearItems.includes(itemName.id)) {
            entity.kill();
        }
    }
    return World.events.tick.unsubscribe(executionItem);
}

function executionEntity() {
    // Find them all and take them out
    let filter = new EntityQueryOptions();
    filter.families = ['monster'];
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        // Despawn this entity
        entity.triggerEvent('paradox:kick');
    }
    return World.events.tick.unsubscribe(executionEntity);
}

function clearlag(id: number) {
    // Get Dynamic Property
    let clearLagBoolean = World.getDynamicProperty('clearlag_b');
    if (clearLagBoolean === undefined) {
        clearLagBoolean = config.modules.clearLag.enabled;
    }
    // Unsubscribe if disabled in-game
    if (clearLagBoolean === false) {
        clearTickInterval(id);
        return;
    }

    /**
     * Check if timer has expired.
     * If timer has expired then we will clear the items and entities
     */
    let cooldownCalc: number;
    let activeTimer: number;
    // Get original time in milliseconds
    let cooldownVerify = cooldownTimer.get(object);
    // Convert config settings to milliseconds so we can be sure the countdown is accurate
    let msSettings = (config.modules.clearLag.days * 24 * 60 * 60 * 1000) + (config.modules.clearLag.hours * 60 * 60 * 1000) + (config.modules.clearLag.minutes * 60 * 1000) + (config.modules.clearLag.seconds * 1000);
    if (cooldownVerify !== undefined) {
        // Determine difference between new and original times in milliseconds
        let bigBrain = new Date().getTime() - cooldownVerify;
        // Subtract realtime clock from countdown in configuration to get difference
        cooldownCalc = msSettings - bigBrain;
        // Convert difference to clock format D : H : M : S
        activeTimer = dhms(cooldownCalc);
    }
    // Give advance warning
    if (activeTimer === 60) {
        // Notify 10 seconds in advance
        sendMsg('@a', `§r§4[§6Paradox§4]§r Server lag will be cleared in 60 seconds!`);
    }
    // Give advance warning
    if (activeTimer === 30) {
        // Notify 10 seconds in advance
        sendMsg('@a', `§r§4[§6Paradox§4]§r Server lag will be cleared in 30 seconds!`);
    }
    // Give advance warning
    if (activeTimer === 10) {
        // Notify 10 seconds in advance
        sendMsg('@a', `§r§4[§6Paradox§4]§r Server lag will be cleared in 10 seconds!`);
    }
    // Give advance warning
    if (activeTimer === 5) {
        // Notify 5 seconds in advance
        sendMsg('@a', `§r§4[§6Paradox§4]§r Server lag will be cleared in 5 seconds!`);
    }
    // If timer doesn't exist or has expired then set the countdown
    if (activeTimer <= 0) {
        // Delete old key and value
        cooldownTimer.delete(object);
        // Clear entities and items
        World.events.tick.subscribe(executionItem);
        World.events.tick.subscribe(executionEntity);
        // Notify that it has been cleared
        sendMsg('@a', `§r§4[§6Paradox§4]§r Server has been cleared to reduce lag!`);
    } else {
        // Create new key and value with current time in milliseconds
        if (cooldownTimer.get(object) === undefined) {
            cooldownTimer.set(object, new Date().getTime());
        }
    }
}

const ClearLag = () => {
    const id = setTickInterval(() => clearlag(id), 20);
};

export { ClearLag };