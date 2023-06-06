import { world, Player, system, EntityQueryOptions, Vector, Vector3, Dimension } from "@minecraft/server";
import { sendMsg } from "../../../util";

const freezeDataMap: Map<string, FreezeData> = new Map();

type FreezeData = {
    player: Player;
    freezeId: number;
    originalLocation: Vector3;
    originalDimension: Dimension;
};

function freezePlayer(player: Player) {
    // Record the player's original location
    const originalLocation = player.location;
    const originalDimension = player.dimension;

    // Teleport the player to the freezing location
    player.teleport(new Vector(originalLocation.x, 245, originalLocation.z), {
        dimension: player.dimension,
        rotation: player.getRotation(),
        facingLocation: player.getViewDirection(),
        checkForBlocks: false,
        keepVelocity: false,
    });

    // Create prison around the player
    player.runCommand(`fill ${originalLocation.x + 2} ${245 + 2} ${originalLocation.z + 2} ${originalLocation.x - 2} ${245 - 1} ${originalLocation.z - 2} barrier [] hollow`);

    // Save the player's freeze data
    const freezeData: FreezeData = {
        player,
        freezeId: -1, // Placeholder value, will be updated later
        originalLocation,
        originalDimension,
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

    const { originalLocation, originalDimension } = freezeData;

    // Remove the prison blocks
    player.runCommand(`fill ${originalLocation.x + 2} ${245 + 2} ${originalLocation.z + 2} ${originalLocation.x - 2} ${245 - 1} ${originalLocation.z - 2} air [] hollow`);

    // Teleport the player back to their original location
    player.teleport(originalLocation, {
        dimension: originalDimension,
        rotation: player.getRotation(),
        facingLocation: player.getViewDirection(),
        checkForBlocks: false,
        keepVelocity: false,
    });

    // Remove the freeze data
    freezeDataMap.delete(player.id);
}

// Function to unfreeze a player by their ID
function unfreezePlayerById(id: string) {
    const player = world.getPlayers().find((check) => {
        return check.id === id;
    });
    if (!player) {
        return; // Player not found
    }

    try {
        unfreezePlayer(player);
    } catch (error) {
        console.error(`Error unfreezing player: ${error}`);
    }
}

// Function to periodically check and freeze players
const freezePlayers = () => {
    const filter: EntityQueryOptions = {
        tags: ["freeze"],
    };
    const players = world.getPlayers(filter);
    for (const player of players) {
        const freezeData = freezeDataMap.get(player.id);
        const hasFreezeTag = player.hasTag("freeze");

        if (!freezeData && hasFreezeTag) {
            freezePlayer(player);
        } else if (freezeData && !hasFreezeTag) {
            unfreezePlayer(player);
        } else if (freezeData && hasFreezeTag) {
            const originalLocation = freezeData.originalLocation;
            if (!originalLocation) {
                continue; // Skip this player if freeze data is missing
            }
            const { x: originalX, z: originalZ } = originalLocation;
            const { x: currentX, y: currentY, z: currentZ } = player.location;
            if (Math.floor(currentX) !== Math.floor(originalX) || Math.floor(currentY) !== 245 || Math.floor(currentZ) !== Math.floor(originalZ)) {
                //

                // Teleport the player to the freezing location
                player.teleport(new Vector(originalX, 245, originalZ), {
                    dimension: world.getDimension("overworld"),
                    rotation: { x: 0, y: 0 },
                    facingLocation: { x: 0, y: 0, z: 0 },
                    checkForBlocks: false,
                    keepVelocity: false,
                });
                // Create prison around the player again
                player.runCommand(`fill ${originalLocation.x + 2} ${245 + 2} ${originalLocation.z + 2} ${originalLocation.x - 2} ${245 - 1} ${originalLocation.z - 2} barrier [] hollow`);
            }
        }
    }

    // Unfreeze players who no longer have the "freeze" tag
    for (const id of freezeDataMap.keys()) {
        const player = world.getPlayers().find((check) => {
            return check.id === id;
        });
        if (!player) {
            continue; // Skip this iteration if player is not available
        }
        try {
            const hasTag = player?.hasTag && player.hasTag("freeze");
            if (!hasTag) {
                unfreezePlayerById(id);
            }
        } catch (error) {
            console.error(`Error unfreezing player with ID ${id}: ${error}`);
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
