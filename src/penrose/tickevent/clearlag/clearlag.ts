import config from "../../../data/config.js";
import { world, EntityQueryOptions, ItemStack, EntityItemComponent, system } from "@minecraft/server";
import { sendMsg } from "../../../util.js";
import { clearItems } from "../../../data/clearlag.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

const cooldownTimer = new WeakMap();
// Just a dummy object to use with set/get
const object = { cooldown: "String" };

function dhms(ms: number) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const daysms = ms % (24 * 60 * 60 * 1000);
    const hours = Math.floor(daysms / (60 * 60 * 1000));
    const hoursms = ms % (60 * 60 * 1000);
    const minutes = Math.floor(hoursms / (60 * 1000));
    const minutesms = ms % (60 * 1000);
    const sec = Math.floor(minutesms / 1000);
    if (days !== 0) {
        return [days, hours, minutes, sec, "days"];
    }
    if (hours !== 0) {
        return [hours, minutes, sec, "hours"];
    }
    if (minutes !== 0) {
        return [minutes, sec, "minutes"];
    }
    return [sec, "seconds"];
}

function executionItem(id: number) {
    // Find them all and take them out
    const filter = new Object() as EntityQueryOptions;
    filter.type = "item";
    for (const entity of World.getDimension("overworld").getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        let itemName: ItemStack;
        // Get component of itemStack for dropped item
        try {
            const itemContainer = entity.getComponent("item") as unknown as EntityItemComponent;
            itemName = itemContainer.itemStack;
        } catch (error) {}
        // Kill dropped items
        if (itemName.typeId in clearItems) {
            entity.kill();
        }
    }
    return system.clearRunSchedule(id);
}

function executionEntity(id: number) {
    // Find them all and take them out
    const filter = new Object() as EntityQueryOptions;
    filter.families = ["monster"];
    for (const entity of World.getDimension("overworld").getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        // Despawn this entity
        kickablePlayers.add(entity);
        entity.triggerEvent("paradox:kick");
    }
    return system.clearRunSchedule(id);
}

function clearlag(id: number) {
    // Get Dynamic Property
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b");

    // Unsubscribe if disabled in-game
    if (clearLagBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }

    /**
     * Check if timer has expired.
     * If timer has expired then we will clear the items and entities
     */
    let cooldownCalc: number;
    let activeTimer = [];
    // Get original time in milliseconds
    const cooldownVerify = cooldownTimer.get(object);
    // Convert config settings to milliseconds so we can be sure the countdown is accurate
    const msSettings = config.modules.clearLag.days * 24 * 60 * 60 * 1000 + config.modules.clearLag.hours * 60 * 60 * 1000 + config.modules.clearLag.minutes * 60 * 1000 + config.modules.clearLag.seconds * 1000;
    if (cooldownVerify !== undefined) {
        // Determine difference between new and original times in milliseconds
        const bigBrain = new Date().getTime() - cooldownVerify;
        // Subtract realtime clock from countdown in configuration to get difference
        cooldownCalc = msSettings - bigBrain;
        // Convert difference to clock format D : H : M : S
        activeTimer = dhms(cooldownCalc);
    }
    // Give advance warning
    if (activeTimer[0] === 1 && activeTimer[2] === "minutes" && activeTimer[1] <= 0) {
        // Notify 60 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server lag will be cleared in 60 seconds!`);
    }
    // Give advance warning
    if (activeTimer[0] === 5 && activeTimer[1] === "seconds") {
        // Notify 5 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server lag will be cleared in:`);
        sendMsg("@a", `§r§4[§6Paradox§4]§r 5`);
    }
    // Give advance warning
    if (activeTimer[0] === 4 && activeTimer[1] === "seconds") {
        // Notify 4 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r 4`);
    }
    // Give advance warning
    if (activeTimer[0] === 3 && activeTimer[1] === "seconds") {
        // Notify 3 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r 3`);
    }
    // Give advance warning
    if (activeTimer[0] === 2 && activeTimer[1] === "seconds") {
        // Notify 2 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r 2`);
    }
    // Give advance warning
    if (activeTimer[0] === 1 && activeTimer[1] === "seconds") {
        // Notify 1 seconds in advance
        sendMsg("@a", `§r§4[§6Paradox§4]§r 1`);
    }
    // If timer doesn't exist or has expired then set the countdown
    if (activeTimer[0] <= 0) {
        // Delete old key and value
        cooldownTimer.delete(object);
        /**
         * We store the identifier in a variable
         * to cancel the execution of this scheduled run
         * if needed to do so.
         *
         * Clear entities and items
         */
        const executionItemId = system.runSchedule(() => {
            executionItem(executionItemId);
        });
        const executionEntityId = system.runSchedule(() => {
            executionEntity(executionEntityId);
        });
        // Notify that it has been cleared
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server has been cleared to reduce lag!`);
    } else {
        // Create new key and value with current time in milliseconds
        if (cooldownTimer.get(object) === undefined) {
            cooldownTimer.set(object, new Date().getTime());
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function ClearLag() {
    const clearLagId = system.runSchedule(() => {
        clearlag(clearLagId);
    }, 20);
}
