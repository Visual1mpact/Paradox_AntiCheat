import { world, Player, EntityHitEntityAfterEvent, system, PlayerLeaveAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { flag } from "../../util.js";
import { dynamicPropertyRegistry } from "../WorldInitializeAfterEvent/registry.js";

// Store the previous locations and velocities of hitEntity and damagingEntity
const previousData: Map<
    string,
    {
        location: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
    }
> = new Map();

function recordPlayerData(player: Player) {
    // Store the current location and velocity of the player
    previousData.set(player.id, {
        location: { ...player.location },
        velocity: { ...player.getVelocity() },
    });
}

function onPlayerLogout(event: PlayerLeaveAfterEvent | string): void {
    // Remove the player's data from the map when they log off
    if (typeof event === "string") {
        const playerName = event;
        previousData.delete(playerName);
    } else {
        const playerName = event.playerId;
        previousData.delete(playerName);
    }
}

function reachb(object: EntityHitEntityAfterEvent) {
    // Get Dynamic Property
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");

    // Unsubscribe if disabled in-game and stop the interval
    if (reachBBoolean === false) {
        previousData.clear();
        stopLocationRecordingInterval();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
        world.afterEvents.entityHitEntity.unsubscribe(reachb);
        return;
    }

    // Properties from class
    const { hitEntity, damagingEntity } = object;

    // If not a player entity then ignore
    if (!(hitEntity instanceof Player) || !(damagingEntity instanceof Player)) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(damagingEntity?.id);

    // Skip if they have permission
    if (uniqueId === damagingEntity.name) {
        return;
    }

    // Get the previous recorded data of hitEntity and damagingEntity
    const previousHitEntityData = previousData.get(hitEntity.id);
    const previousDamagingEntityData = previousData.get(damagingEntity.id);

    if (previousHitEntityData && previousDamagingEntityData && isWithinReach(previousHitEntityData, previousDamagingEntityData, hitEntity.location, damagingEntity.location)) {
        // Update the recorded data for hitEntity and damagingEntity
        recordPlayerData(hitEntity);
        recordPlayerData(damagingEntity);
        return;
    }

    // Reset the reach distance after each hit
    resetReachDistance(damagingEntity);

    // Calculate the actual reach distance with velocities
    const reachDistance = calculateReachDistanceWithVelocity(previousDamagingEntityData, previousHitEntityData, damagingEntity.location, hitEntity.location);

    // Round down the reachDistance to the nearest integer
    const roundedReachDistance = Math.floor(reachDistance);
    if (roundedReachDistance > config.modules.reachB.reach) {
        // Flagging is done, now we can remove the player entity from previousData
        onPlayerLogout(damagingEntity.id);
        onPlayerLogout(hitEntity.id);
        flag(damagingEntity, "Reach", "B", "Attack", null, null, "reach", reachDistance.toFixed(2), false);
    }
    // Flagging is done, now we can remove the player entity from previousData
    onPlayerLogout(damagingEntity.id);
    onPlayerLogout(hitEntity.id);
}

function isWithinReach(
    previousHitEntityData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    previousDamagingEntityData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    currentHitEntityLocation: { x: number; y: number; z: number },
    currentDamagingEntityLocation: { x: number; y: number; z: number }
): boolean {
    if (!previousHitEntityData || !previousDamagingEntityData) {
        return false;
    }

    // Calculate the distance squared between the previous and current locations of hitEntity and damagingEntity
    const hitEntityDistanceSquared = calculateDistanceSquared(previousHitEntityData.location, currentHitEntityLocation);
    const damagingEntityDistanceSquared = calculateDistanceSquared(previousDamagingEntityData.location, currentDamagingEntityLocation);

    // Compare the distances with the allowed distance squared
    const allowedDistanceSquared = config.modules.reachB.reach;
    return hitEntityDistanceSquared <= allowedDistanceSquared && damagingEntityDistanceSquared <= allowedDistanceSquared;
}

function calculateDistanceSquared(position1: { x: number; y: number; z: number }, position2: { x: number; y: number; z: number }): number {
    const dx = position2.x - position1.x;
    const dy = position2.y - position1.y;
    const dz = position2.z - position1.z;
    return dx * dx + dy * dy + dz * dz;
}

function calculateReachDistanceWithVelocity(
    previousDamagingEntityData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    previousHitEntityData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    currentDamagingEntityLocation: { x: number; y: number; z: number },
    currentHitEntityLocation: { x: number; y: number; z: number }
): number {
    if (!previousDamagingEntityData) {
        // Use the current damaging entity location as the previous location if not available
        previousDamagingEntityData = {
            location: { ...currentDamagingEntityLocation },
            velocity: { x: 0, y: 0, z: 0 },
        };
    }
    if (!previousHitEntityData) {
        // Use the current hit entity location as the previous location if not available
        previousHitEntityData = {
            location: { ...currentHitEntityLocation },
            velocity: { x: 0, y: 0, z: 0 },
        };
    }

    // Incorporate velocities into the reach distance calculation
    const dx = currentHitEntityLocation.x + previousHitEntityData.velocity.x - previousDamagingEntityData.location.x - previousDamagingEntityData.velocity.x;
    const dy = currentHitEntityLocation.y + previousHitEntityData.velocity.y - previousDamagingEntityData.location.y - previousDamagingEntityData.velocity.y;
    const dz = currentHitEntityLocation.z + previousHitEntityData.velocity.z - previousDamagingEntityData.location.z - previousDamagingEntityData.velocity.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function resetReachDistance(player: Player) {
    // Reset the previous location and velocity of the player to the current location and velocity
    recordPlayerData(player);
}

// Interval ID to stop the recording
let locationRecordingInterval: number;

function startLocationRecordingInterval() {
    locationRecordingInterval = system.runInterval(() => {
        const players = world.getAllPlayers();
        for (const player of players) {
            recordPlayerData(player);
        }
    }, 20);
}

function stopLocationRecordingInterval() {
    system.clearRun(locationRecordingInterval);
}

const ReachB = () => {
    // Subscribe to the tick event to record player locations and velocities
    startLocationRecordingInterval();

    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
    world.afterEvents.entityHitEntity.subscribe(reachb);
};

export { ReachB };
