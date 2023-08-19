import { world, Player, system, EntityQueryOptions, Vector, Vector3, Dimension } from "@minecraft/server";
import { sendMsg, setTimer } from "../../../util";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";

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

    setTimer(player.id);
    // Teleport the player to the freezing location
    player.teleport(new Vector(originalLocation.x, 245, originalLocation.z), {
        dimension: world.getDimension("overworld"),
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
        originalLocation: originalLocation,
        originalDimension: originalDimension,
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

    setTimer(player.id);
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
        tags: ["paradoxFreeze"],
    };
    const players = world.getPlayers(filter);
    for (const player of players) {
        const freezeData = freezeDataMap.get(player.id);
        const hasFreezeTag = player.hasTag("paradoxFreeze");
        const hasAuraTag = player.hasTag("freezeAura");
        const hasNukerTag = player.hasTag("freezeNukerA");

        if (!freezeData && hasFreezeTag) {
            freezePlayer(player);
        } else if (freezeData && !hasFreezeTag) {
            unfreezePlayer(player);
        } else if (freezeData && hasFreezeTag) {
            const originalLocation = freezeData.originalLocation;
            if (!originalLocation) {
                continue; // Skip this player if freeze data is missing
            }
            const effects = [MinecraftEffectTypes.Blindness, MinecraftEffectTypes.MiningFatigue, MinecraftEffectTypes.Weakness, MinecraftEffectTypes.Slowness];
            for (const typeEffect of effects) {
                if (!player.getEffect(typeEffect)) {
                    player.addEffect(typeEffect, 1000000, { amplifier: 255, showParticles: true });
                }
            }
            const { x: originalX, z: originalZ } = originalLocation;
            const { x: currentX, y: currentY, z: currentZ } = player.location;
            if (Math.floor(currentX) !== Math.floor(originalX) || Math.floor(currentY) !== 245 || Math.floor(currentZ) !== Math.floor(originalZ)) {
                setTimer(player.id);
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

            // If both tags exist display custom message
            if (hasAuraTag && hasNukerTag) {
                player.onScreenDisplay.setTitle("§f§4[§6Paradox§4]§f Frozen!", { subtitle: "§fContact Staff §4[§6KA§4]§f§4[§6NA§4]§f", fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 60 });
            } else {
                player.onScreenDisplay.setTitle("§f§4[§6Paradox§4]§f Frozen!", { subtitle: "§fContact Staff §o§4[§6Command§4]§f", fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 60 });
            }
        }
    }

    // Unfreeze players who no longer have the "paradoxFreeze" tag
    for (const id of freezeDataMap.keys()) {
        const player = world.getPlayers().find((check) => {
            return check.id === id;
        });
        if (!player) {
            continue; // Skip this iteration if player is not available
        }
        try {
            const hasTag = player?.hasTag && player.hasTag("paradoxFreeze");
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
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.playerName}§f was frozen and left the server.`);
        }
    });
};

// Subscribe to the playerJoin event to handle frozen players returning
export const freezeJoin = (): void => {
    world.afterEvents.playerJoin.subscribe((player) => {
        const boolean = freezeDataMap.has(player.playerId);
        if (boolean) {
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.playerName}§f was frozen and returned to the server.`);
        }
    });
};

// Run the freezePlayers function every 3 seconds
export const freeze = system.runInterval(freezePlayers, 60); // 20 ticks = 1 second
