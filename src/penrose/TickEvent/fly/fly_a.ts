import { world, EntityQueryOptions, GameMode, system, Vector3 } from "@minecraft/server";
import { flag, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

const playersOldCoordinates = new Map<string, Vector3>();
const playersAirTimeStart = new Map<string, number>();

function flya(id: number) {
    // Get Dynamic Property
    const flyABoolean = dynamicPropertyRegistry.get("flya_b");
    // Unsubscribe if disabled in-game
    if (flyABoolean === false) {
        playersOldCoordinates.clear();
        system.clearRun(id);
        return;
    }
    // Exclude creative, and spectator gamemode
    const gm: EntityQueryOptions = {
        excludeGameModes: [GameMode.creative, GameMode.spectator],
    };
    const filteredPlayers = world.getPlayers(gm);
    // run as each player who are in survival
    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);
        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }
        const jumpCheck = player.isJumping;
        if (jumpCheck && !playersAirTimeStart.has(player.name)) {
            playersAirTimeStart.set(player.name, Date.now());
        }
        const groundCheck = player.isOnGround;
        if (groundCheck) {
            playersAirTimeStart.set(player.name, Date.now());
            continue;
        }
        const glideCheck = player.isGliding;
        if (glideCheck) {
            playersAirTimeStart.set(player.name, Date.now());
            continue;
        }
        const fallCheck = player.isFalling;
        if (fallCheck) {
            if (fallCheck) {
                // Player is falling, subtract a specified amount of time from the air time
                const airTimeStart = playersAirTimeStart.get(player.name);
                if (airTimeStart) {
                    const newAirTimeStart = Math.max(airTimeStart - 500, 0); // Subtract 500 milliseconds (adjust as needed) and ensure it's not negative
                    playersAirTimeStart.set(player.name, newAirTimeStart);
                }
                continue;
            }
        }
        const waterCheck = player.isInWater || player.isSwimming;
        if (waterCheck) {
            // Player is falling, ignore them
            playersAirTimeStart.set(player.name, Date.now());
            continue;
        }
        if (playersAirTimeStart.has(player.name)) {
            const airTime = Date.now() - playersAirTimeStart.get(player.name);
            if (airTime >= 4000) {
                const velocity = player.getVelocity();
                const horizontalVelocity = { x: velocity.x, y: 0, z: velocity.z };
                const xyVelocity = Math.hypot(horizontalVelocity.x, horizontalVelocity.y).toFixed(4);
                const zyVelocity = Math.hypot(horizontalVelocity.z, horizontalVelocity.y).toFixed(4);
                if (Number(xyVelocity) > 0 || Number(zyVelocity) > 0) {
                    const oldPlayerCoords = playersOldCoordinates.get(player.name);
                    const playerX = Math.trunc(player.location.x);
                    const playerY = Math.trunc(player.location.y);
                    const playerZ = Math.trunc(player.location.z);
                    playersOldCoordinates.set(player.name, { x: playerX, y: playerY, z: playerZ });
                    /**
                     * startTimer will make sure the key is properly removed
                     * when the time for theVoid has expired. This will preserve
                     * the integrity of our Memory.
                     */
                    const timerExpired = startTimer("flya", player.name, Date.now());
                    if (timerExpired.namespace.indexOf("flya") !== -1 && timerExpired.expired) {
                        const deletedKey = timerExpired.key; // extract the key without the namespace prefix
                        playersOldCoordinates.delete(deletedKey);
                        playersAirTimeStart.delete(deletedKey);
                    }
                    if (oldPlayerCoords) {
                        let isSurroundedByAir = true;
                        for (let x = -1; x <= 1; x++) {
                            for (let y = -1; y <= 1; y++) {
                                for (let z = -1; z <= 1; z++) {
                                    const block = player.dimension.getBlock({ x: player.location.x + x, y: player.location.y + y, z: player.location.z + z });
                                    if (block.typeId !== "minecraft:air") {
                                        isSurroundedByAir = false;
                                        break;
                                    }
                                }
                            }
                        }
                        if (isSurroundedByAir) {
                            try {
                                // Use try/catch since variables for cords could return undefined if player is loading in
                                // and they meet the conditions. An example is them flagging this, logging off, then logging
                                // back on again.
                                player.teleport(
                                    { x: oldPlayerCoords.x, y: oldPlayerCoords.y, z: oldPlayerCoords.z },
                                    {
                                        dimension: player.dimension,
                                        rotation: { x: 0, y: 0 },
                                        facingLocation: { x: 0, y: 0, z: 0 },
                                        checkForBlocks: false,
                                        keepVelocity: false,
                                    }
                                );
                            } catch (error) {}
                            flag(player, "Fly", "A", "Exploit", null, null, null, null, false);
                        }
                    }
                }
                const playerAnimation = player.isOnGround || player.isInWater || player.isSwimming;
                if (playerAnimation) {
                    playersAirTimeStart.delete(player.name);
                }
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function FlyA() {
    const flyAId = system.runInterval(() => {
        flya(flyAId);
    }, 20);
}
