import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { EntityQueryOptions } from "mojang-minecraft";
import { sendMsg } from "../../../util.js";
import { clearTickInterval, setTickInterval } from "../../../misc/scheduling.js";

const World = world;

let cooldownTimer = new WeakMap();
// Just a dummy object to use with set/get
let object = {"cooldown": "String"};

function dhms (ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const daysms = ms % (24*60*60*1000);
    const hours = Math.floor(daysms / (60*60*1000));
    const hoursms = ms % (60*60*1000);
    const minutes = Math.floor(hoursms / (60*1000));
    const minutesms = ms % (60*1000);
    const sec = Math.floor(minutesms / 1000);
    /*
    if (days !== 0) {
        return days + " Days : " + hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (hours !== 0) {
        return hours + " Hours : " + minutes + " Minutes : " + sec + " Seconds";
    }
    if (minutes !== 0) {
        return minutes + " Minutes : " + sec + " Seconds";
    }
    */
    if (sec !== 0) {
        return sec;
    }
}

function execution() {
    // Find them all and take them out
    let filter = new EntityQueryOptions();
    filter.families = ['monster'];
    filter.type = "item";
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // Check if entity object returns undefined
        if (entity === undefined) {
            continue;
        }

        if (entity.id === "minecraft:item") {
            entity.kill();
        } else {
            // Despawn this entity
            entity.triggerEvent('paradox:kick');
        }
    }
    return;
}

function clearlag(id) {
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
    let cooldownCalc;
    let activeTimer;
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
        execution();
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