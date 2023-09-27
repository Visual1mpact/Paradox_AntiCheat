import { world, EntityQueryOptions, GameMode, system, Vector3, PlayerLeaveAfterEvent } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

// Store last safe location
const lastSafeLocation = new Map<string, Vector3>();

// Solids that are passable with conditions
const passableSolids = new Set(["sand", "gravel", "concrete_powder"]);

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    lastSafeLocation.delete(playerName);
}

function antiphasea(id: number) {
    // Get Dynamic Property
    const antiphaseABoolean = dynamicPropertyRegistry.get("antiphasea_b");

    // Unsubscribe if disabled in-game
    if (!antiphaseABoolean) {
        lastSafeLocation.clear();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
        system.clearRun(id);
        return;
    }

    // Exclude players who are in spectator mode or vanished.
    const gm: EntityQueryOptions = {
        excludeGameModes: [GameMode.spectator],
        excludeTags: ["vanish"],
    };
    const filteredPlayers = world.getPlayers(gm);

    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const { x, y, z } = player.location;

        // Calculate block locations
        const lowerBody = { x, y, z };

        let blockType;
        try {
            blockType = player.dimension.getBlock(lowerBody);
        } catch {}

        const unsafeConditions = blockType && ((blockType.typeId === "minecraft:soul_sand" && y - lowerBody.y <= 0.125) || player.hasTag("riding") || passableSolids.has(blockType.typeId.replace("minecraft:", "")));

        if (!unsafeConditions) {
            // Update last safe location
            lastSafeLocation.set(player.id, player.location);
        } else {
            // Flag player and teleport to last safe location if available
            flag(player, "AntiPhase", "A", "Exploit", null, null, null, null, false);
            const safeLocation = lastSafeLocation.get(player.id);
            if (safeLocation) {
                player.teleport(safeLocation, {
                    dimension: player.dimension,
                    rotation: { x: 0, y: 0 },
                    facingLocation: { x: 0, y: 0, z: 0 },
                    checkForBlocks: false,
                    keepVelocity: false,
                });
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function AntiPhaseA() {
    // Catch players leaving to manage memory
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);

    const antiPhaseAId = system.runInterval(() => {
        antiphasea(antiPhaseAId);
    }, 20);
}
