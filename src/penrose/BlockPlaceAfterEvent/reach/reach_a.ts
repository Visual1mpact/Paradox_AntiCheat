import { world, Player, system, BlockPlaceAfterEvent, MinecraftBlockTypes, Block } from "@minecraft/server";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

// Store the previous locations and velocities of block and player
const previousData: Map<
    Player,
    {
        location: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
    }
> = new Map();

function recordPlayerData(player: Player) {
    // Store the current location and velocity of the player
    previousData.set(player, {
        location: { ...player.location },
        velocity: { ...player.getVelocity() },
    });
}

function reacha(object: BlockPlaceAfterEvent) {
    // Get Dynamic Property
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");

    // Unsubscribe if disabled in-game and stop the interval
    if (reachABoolean === false) {
        world.afterEvents.blockPlace.unsubscribe(reacha);
        stopLocationRecordingInterval();
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

    // If not a player entity or a block then ignore
    if (!(player instanceof Player) || !(block instanceof Block)) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Get the previous recorded data of block and player
    const previousblockData = previousData.get(block);
    const previousplayerData = previousData.get(player);

    if (previousblockData && previousplayerData && isWithinReach(previousblockData, previousplayerData, block.location, player.location)) {
        // Update the recorded data for block and player
        recordPlayerData(block);
        recordPlayerData(player);
        return;
    }

    // Reset the reach distance after each hit
    resetReachDistance(player);

    // Calculate the actual reach distance with velocities
    const reachDistance = calculateReachDistanceWithVelocity(previousplayerData, previousblockData, player.location, block.location);

    // Round down the reachDistance to the nearest integer
    const roundedReachDistance = Math.floor(reachDistance);
    if (roundedReachDistance > config.modules.reachA.reach) {
        dimension.getBlock(block.location).setType(MinecraftBlockTypes.air);
        flag(player, "Reach", "A", "Placement", null, null, "reach", roundedReachDistance.toString(), false);
    }
}

function isWithinReach(
    previousblockData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    previousplayerData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    currentblockLocation: { x: number; y: number; z: number },
    currentplayerLocation: { x: number; y: number; z: number }
): boolean {
    if (!previousblockData || !previousplayerData) {
        return false;
    }

    // Calculate the distance squared between the previous and current locations of block and player
    const blockDistanceSquared = calculateDistanceSquared(previousblockData.location, currentblockLocation);
    const playerDistanceSquared = calculateDistanceSquared(previousplayerData.location, currentplayerLocation);

    // Compare the distances with the allowed distance squared
    const allowedDistanceSquared = config.modules.reachA.reach;
    return blockDistanceSquared <= allowedDistanceSquared && playerDistanceSquared <= allowedDistanceSquared;
}

function calculateDistanceSquared(position1: { x: number; y: number; z: number }, position2: { x: number; y: number; z: number }): number {
    const dx = position2.x - position1.x;
    const dy = position2.y - position1.y;
    const dz = position2.z - position1.z;
    return dx * dx + dy * dy + dz * dz;
}

function calculateReachDistanceWithVelocity(
    previousplayerData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    previousblockData: { location: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } },
    currentplayerLocation: { x: number; y: number; z: number },
    currentblockLocation: { x: number; y: number; z: number }
): number {
    if (!previousplayerData) {
        // Use the current damaging entity location as the previous location if not available
        previousplayerData = {
            location: { ...currentplayerLocation },
            velocity: { x: 0, y: 0, z: 0 },
        };
    }
    if (!previousblockData) {
        // Use the current hit entity location as the previous location if not available
        previousblockData = {
            location: { ...currentblockLocation },
            velocity: { x: 0, y: 0, z: 0 },
        };
    }

    // Incorporate velocities into the reach distance calculation
    const dx = currentblockLocation.x + previousblockData.velocity.x - previousplayerData.location.x - previousplayerData.velocity.x;
    const dy = currentblockLocation.y + previousblockData.velocity.y - previousplayerData.location.y - previousplayerData.velocity.y;
    const dz = currentblockLocation.z + previousblockData.velocity.z - previousplayerData.location.z - previousplayerData.velocity.z;

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
        for (const player of world.getAllPlayers()) {
            recordPlayerData(player);
        }
    }, 20);
}

function stopLocationRecordingInterval() {
    system.clearRun(locationRecordingInterval);
}

const ReachA = () => {
    // Subscribe to the tick event to record player locations and velocities
    startLocationRecordingInterval();

    world.afterEvents.blockPlace.subscribe(reacha);
};

export { ReachA };
