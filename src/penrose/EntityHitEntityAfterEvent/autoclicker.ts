import { world, Player, EntityHitEntityAfterEvent, system } from "@minecraft/server";
import { MinecraftEntityTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { dynamicPropertyRegistry } from "../WorldInitializeAfterEvent/registry";
import { flag } from "../../util";

// Define interface for a player click object
interface Click {
    timestamp: number;
}

interface PlayerWithClicks extends Player {
    clicks?: Click[];
}

/**
 * Get a player's clicks per second
 * @param player - The player whose clicks per second to get
 * @returns The number of clicks per second
 */
function getPlayerCPS(player: PlayerWithClicks): number {
    const timestamp: number = new Date().getTime();
    const clicks: Click[] = (player["clicks"] as Click[]) ?? [];
    // Remove clicks that are over 1 second old
    while (clicks.length > 0 && timestamp - clicks[0].timestamp >= 1000) {
        clicks.shift();
    }
    player["clicks"] = clicks;
    return clicks.length;
}

/**
 * Validate players' clicks per second against a maximum and raise flag if exceeded
 * @param id - The ID of the timeout run
 * @param max - The maximum allowed clicks per second
 */
function cpsValidation(id: number, max: number): void {
    // Get Dynamic Property for autoclicker
    const autoclickerBoolean = dynamicPropertyRegistry.get("autoclicker_b") as boolean;

    // Unsubscribe if autoclicker is disabled in-game
    if (autoclickerBoolean === false) {
        system.clearRun(id);
        return;
    }

    // Get all players in the world
    const players: Player[] = world.getPlayers();
    // Check each player's clicks per second and raise a flag if it's too high
    for (const player of players) {
        const current: number = getPlayerCPS(player);
        if (current > max) {
            flag(player, "Autoclicker", "A", "Combat", null, null, "CPS", current.toString(), false);
        }
    }
}

/**
 * Track player clicks and update click object with new timestamp on each hit
 * @param event - The EntityHitAfterEvent object
 */
function autoclicker(event: EntityHitEntityAfterEvent): void {
    // Get Dynamic Property for autoclicker
    const autoclickerBoolean = dynamicPropertyRegistry.get("autoclicker_b") as boolean;

    // Unsubscribe if autoclicker is disabled in-game
    if (autoclickerBoolean === false) {
        world.afterEvents.entityHitEntity.unsubscribe(autoclicker);
        return;
    }

    const { damagingEntity } = event;

    // If it's not a player then ignore
    if (!(damagingEntity instanceof Player)) {
        return;
    }

    // Explicitly casting the entity variable to PlayerWithClicks
    const playerWithClicks = damagingEntity as PlayerWithClicks;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(damagingEntity?.id);

    // Skip if they have permission
    if (uniqueId === damagingEntity.name) {
        return;
    }

    const modifiedTypeId = damagingEntity.typeId.replace("minecraft:", "");
    // If the entity hit is a player, update their click object with a new timestamp
    if (modifiedTypeId === MinecraftEntityTypes.Player) {
        const timestamp: number = new Date().getTime();
        const clicks: Click[] = (playerWithClicks["clicks"] as Click[]) ?? [];
        // Remove clicks that are over 1 second old
        while (clicks.length > 0 && timestamp - clicks[0].timestamp >= 1000) {
            clicks.shift();
        }
        clicks.unshift({ timestamp });
        playerWithClicks["clicks"] = clicks;
    }
}

// Define the AutoClicker function
const AutoClicker = (): void => {
    const maxCPS: number = 30;
    // Subscribe to the entityHit event to track player clicks
    world.afterEvents.entityHitEntity.subscribe(autoclicker);
    // Set an interval to run the CPS validation function every 20 ticks
    const id: number = system.runInterval(() => {
        cpsValidation(id, maxCPS);
    }, 20);
};

export { AutoClicker };
