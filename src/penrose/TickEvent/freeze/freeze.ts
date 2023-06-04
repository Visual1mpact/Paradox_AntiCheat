import { world, Player, system, EntityQueryOptions, Vector } from "@minecraft/server";
import { sendMsg } from "../../../util";

const freezeDataMap: Map<string, FreezeData> = new Map();

type FreezeData = {
    player: Player;
    freezeId: number;
    originalLocation: { x: number; y: number; z: number };
};

function freezePlayer(player: Player) {
    // Record the player's original location
    const originalLocation = player.location;

    // Teleport the player to the freezing location
    player.teleport(new Vector(originalLocation.x, 245, originalLocation.z), {
        dimension: world.getDimension("overworld"),
        rotation: { x: 0, y: 0 },
        facingLocation: { x: 0, y: 0, z: 0 },
        checkForBlocks: false,
        keepVelocity: false,
    });

    // Create prison around the player
    player.runCommand("fill ~1 ~2 ~1 ~-1 ~-1 ~-1 barrier [] hollow");

    // Save the player's freeze data
    const freezeData: FreezeData = {
        player,
        freezeId: -1, // Placeholder value, will be updated later
        originalLocation,
    };
    freezeDataMap.set(player.id, freezeData);
}

function unfreezePlayer(player: Player) {
    if (!player) {
        return; // Player object is undefined or null
    }

    const freezeData = freezeDataMap.get(player.id);
    if (!freezeData) {
        return; // Player not frozen
    }

    // Remove the prison blocks
    player.runCommand("fill ~1 ~2 ~1 ~-1 ~-1 ~-1 air [] hollow");

    // Teleport the player back to their original location
    const { originalLocation } = freezeData;
    player.teleport(originalLocation, {
        dimension: world.getDimension("overworld"),
        rotation: { x: 0, y: 0 },
        facingLocation: { x: 0, y: 0, z: 0 },
        checkForBlocks: false,
        keepVelocity: false,
    });

    // Remove the freeze data
    freezeDataMap.delete(player.id);
}

// Function to periodically check and freeze players
const freezePlayers = () => {
    const filter: EntityQueryOptions = {
        tags: ["freeze"],
    };
    const players = world.getPlayers(filter);
    for (const player of players) {
        const booleanDataMap = freezeDataMap.has(player?.id);
        const playerData = freezeDataMap.get(player?.id);
        if (!booleanDataMap) {
            freezePlayer(player);
        } else {
            const originalLocation = playerData?.originalLocation;
            if (!originalLocation) {
                continue; // Skip this player if freeze data is missing
            }
            const { x: originalX, y: _, z: originalZ } = originalLocation;
            const { x: currentX, y: currentY, z: currentZ } = player.location;
            if (Math.floor(currentX) !== Math.floor(originalX) || Math.floor(currentY) !== 245 || Math.floor(currentZ) !== Math.floor(originalZ)) {
                // Teleport the player to the freezing location
                player.teleport(new Vector(originalX, 245, originalZ), {
                    dimension: world.getDimension("overworld"),
                    rotation: { x: 0, y: 0 },
                    facingLocation: { x: 0, y: 0, z: 0 },
                    checkForBlocks: false,
                    keepVelocity: false,
                });
                // Create prison around the player again
                player.runCommand("fill ~1 ~2 ~1 ~-1 ~-1 ~-1 barrier [] hollow");
            }
        }
    }
    // Unfreeze players who no longer have the "freeze" tag
    for (const [, freezeData] of freezeDataMap.entries()) {
        const player = freezeData?.player;
        const hasTag = player && player.hasTag("freeze");
        if (!hasTag) {
            unfreezePlayer(player);
        }
    }
};

// Subscribe to the playerLeave event to handle frozen players leaving
export const freezeLeave = (): void => {
    world.afterEvents.playerLeave.subscribe((player) => {
        const boolean = freezeDataMap.has(player.playerId);
        if (boolean) {
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.playerName}§r was frozen and left the server.`);
        }
    });
};

// Subscribe to the playerJoin event to handle frozen players returning
export const freezeJoin = (): void => {
    world.afterEvents.playerJoin.subscribe((player) => {
        const boolean = freezeDataMap.has(player.playerId);
        if (boolean) {
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.playerName}§r was frozen and returned to the server.`);
        }
    });
};

// Run the freezePlayers function every 3 seconds
export const freeze = system.runInterval(freezePlayers, 60); // 20 ticks = 1 second
