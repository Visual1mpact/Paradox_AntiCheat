import config from "../../../data/config.js";
import { world, system } from "@minecraft/server";
import { sendMsg } from "../../../util.js";
import { clearItems } from "../../../data/clearlag.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const cooldownTimer = new WeakMap();
// Just a dummy object to use with set/get
const object = { cooldown: "String" };

const countdown = {
    days: config.modules.clearLag.days,
    hours: config.modules.clearLag.hours,
    minutes: config.modules.clearLag.minutes,
    seconds: config.modules.clearLag.seconds,
};

let warned = false; // variable to track whether the 60 second warning has been displayed

function clearEntityItems() {
    const filter = { type: "item" };
    const entitiesCache = world.getDimension("overworld").getEntities(filter);
    for (const entity of entitiesCache) {
        const itemName = entity.getComponent("item");
        if (itemName.typeId in clearItems) {
            entity.kill();
        }
    }
}

function clearEntities() {
    const filter = { families: ["monster"] };
    const entitiesCache = world.getDimension("overworld").getEntities(filter);
    for (const entity of entitiesCache) {
        kickablePlayers.add(entity);
        entity.triggerEvent("paradox:kick");
    }
}

function clearLag(id: number) {
    // Get Dynamic Property
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b");

    // Unsubscribe if disabled in-game
    if (clearLagBoolean === false) {
        system.clearRun(id);
        return;
    }

    let cooldownVerify = cooldownTimer.get(object);
    if (!cooldownVerify) {
        cooldownVerify = Date.now();
        cooldownTimer.set(object, cooldownVerify);
    }

    const msSettings = countdown.days * 24 * 60 * 60 * 1000 + countdown.hours * 60 * 60 * 1000 + countdown.minutes * 60 * 1000 + countdown.seconds * 1000;
    const timeLeft = msSettings - (Date.now() - cooldownVerify);

    if (timeLeft <= 0) {
        clearEntityItems();
        clearEntities();
        cooldownTimer.delete(object);
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server lag has been cleared!`);
        warned = false; // reset the warned variable so that the 60 second warning will display again next time
    } else if (timeLeft < 60000 && timeLeft > 0 && !warned) {
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server lag will be cleared in 60 seconds!`);
        warned = true; // set the warned variable to true so that the 60 second warning won't display again
    } else if (timeLeft <= 5000 && timeLeft > 0) {
        sendMsg("@a", `§r§4[§6Paradox§4]§r Server lag will be cleared in ${Math.ceil(timeLeft / 1000)} seconds!`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function ClearLag() {
    const clearLagId = system.runInterval(() => {
        clearLag(clearLagId);
    }, 20);
}
