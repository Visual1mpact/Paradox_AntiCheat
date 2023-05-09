import { MinecraftEntityTypes, world, Player, EntityHitEvent, system } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../worldinitializeevent/registry";
import { flag } from "../../util";

// Define interface for a player click object
interface Click {
    timestamp: number;
}

/**
 * Get a player's clicks per second
 * @param player - The player whose clicks per second to get
 * @returns The number of clicks per second
 */
function getPlayerCPS(player: Player): number {
    console.log("confirmed");
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
    const autoclickerBoolean: boolean | undefined = dynamicPropertyRegistry.get("autoclicker_b");

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
            flag(player, "Autoclicker", "A", "Combat", null, null, "CPS", current.toString(), false, null);
        }
    }
}

/**
 * Track player clicks and update click object with new timestamp on each hit
 * @param event - The EntityHitEvent object
 */
function autoclicker(event: EntityHitEvent): void {
    // Get Dynamic Property for autoclicker
    const autoclickerBoolean: boolean | undefined = dynamicPropertyRegistry.get("autoclicker_b");

    // Unsubscribe if autoclicker is disabled in-game
    if (autoclickerBoolean === false) {
        world.events.entityHit.unsubscribe(autoclicker);
        return;
    }

    const { entity } = event;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(entity.scoreboard.id);

    // Skip if they have permission
    // .name doesn't exist on entity class so we use nameTag since we never modify .nameTag anyways
    if (uniqueId === entity.nameTag) {
        return;
    }

    // If the entity hit is a player, update their click object with a new timestamp
    if (entity.typeId === MinecraftEntityTypes.player.id) {
        const timestamp: number = new Date().getTime();
        const clicks: Click[] = (entity["clicks"] as Click[]) ?? [];
        // Remove clicks that are over 1 second old
        while (clicks.length > 0 && timestamp - clicks[0].timestamp >= 1000) {
            clicks.shift();
        }
        clicks.unshift({ timestamp });
        entity["clicks"] = clicks;
    }
}

// Define the AutoClicker function
const AutoClicker = (): void => {
    const maxCPS: number = 12;
    // Subscribe to the entityHit event to track player clicks
    world.events.entityHit.subscribe(autoclicker);
    // Set an interval to run the CPS validation function every 20 ticks
    const id: number = system.runInterval(() => {
        cpsValidation(id, maxCPS);
    }, 20);
};

export { AutoClicker };
