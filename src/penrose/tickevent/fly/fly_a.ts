import { dynamicPropertyRegistry, EntityQueryOptions, flag, GameMode, startTimer, system, Vector, world } from "../../../index";

const playersOldCoordinates = new Map<string, Vector>();

function flya(id: number) {
    // Get Dynamic Property
    const flyABoolean = dynamicPropertyRegistry.get("flya_b");

    // Unsubscribe if disabled in-game
    if (flyABoolean === false) {
        playersOldCoordinates.clear();
        system.clearRun(id);
        return;
    }

    // Exclude creative gamemode
    const gm = new Object() as EntityQueryOptions;
    gm.excludeGameModes = [GameMode.creative, GameMode.spectator];
    // run as each player who are in survival
    for (const player of world.getPlayers(gm)) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const jumpCheck = player.hasTag("jump");
        if (jumpCheck) {
            continue;
        }

        const glideCheck = player.hasTag("gliding");
        if (glideCheck) {
            continue;
        }

        const velocity = player.getVelocity();
        if (velocity.y < 0) {
            // Player is falling, ignore them
            continue;
        }
        const horizontalVelocity = new Vector(velocity.x, 0, velocity.z);

        const xyVelocity = Math.hypot(horizontalVelocity.x, horizontalVelocity.y).toFixed(4);
        const zyVelocity = Math.hypot(horizontalVelocity.z, horizontalVelocity.y).toFixed(4);

        if (Number(xyVelocity) > 0 || Number(zyVelocity) > 0) {
            const oldPlayerCoords = playersOldCoordinates.get(player.name);

            const playerX = Math.trunc(player.location.x);
            const playerY = Math.trunc(player.location.y);
            const playerZ = Math.trunc(player.location.z);
            playersOldCoordinates.set(player.name, new Vector(playerX, playerY, playerZ));

            /**
             * startTimer will make sure the key is properly removed
             * when the time for theVoid has expired. This will preserve
             * the integrity of our Memory.
             */
            const timerExpired = startTimer("flya", player.name, Date.now());
            if (timerExpired.namespace.indexOf("flya") !== -1) {
                const deletedKey = timerExpired.key; // extract the key without the namespace prefix
                playersOldCoordinates.delete(deletedKey);
            }

            if (oldPlayerCoords) {
                let isSurroundedByAir = true;

                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        for (let z = -1; z <= 1; z++) {
                            const block = player.dimension.getBlock(new Vector(player.location.x + x, player.location.y + y, player.location.z + z));

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
                        player.teleport(new Vector(oldPlayerCoords.x, oldPlayerCoords.y, oldPlayerCoords.z), player.dimension, 0, 0);
                    } catch (error) {}
                    flag(player, "Fly", "A", "Exploit", null, null, null, null, false, null);
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
