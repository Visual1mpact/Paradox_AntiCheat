import { dynamicPropertyRegistry, MinecraftBlockTypes, Player, sendMsgToPlayer, setTimer, system, Vector, world } from "../../../index";

// Make sure they don't tp inside a solid block
function safetyProtocol(player: Player, x: number, y: number, z: number) {
    const blockVerification = Math.ceil(y) + 1;
    let safe = null;
    let i = blockVerification;
    while (i < blockVerification + 100 && !safe) {
        const testAir = player.dimension.getBlock(new Vector(x, i, z));
        if (testAir.typeId === "minecraft:air") {
            safe = testAir.y;
        }
        i++;
    }
    return safe || y;
}

function worldborder(id: number) {
    // Dynamic Properties for boolean
    const worldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");

    // Dynamic Properties for number
    const worldBorderOverworldNumber = dynamicPropertyRegistry.get("worldborder_n");
    const worldBorderNetherNumber = dynamicPropertyRegistry.get("worldborder_nether_n");

    // Unsubscribe if disabled in-game
    if (worldBorderBoolean === false) {
        system.clearRun(id);
        return;
    }
    for (const player of world.getPlayers()) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        // What is it currently set to
        let overworldSize = Number(worldBorderOverworldNumber);
        let netherSize = Number(worldBorderNetherNumber);

        // Make sure it's not a negative
        if (overworldSize < 0) {
            overworldSize = Math.abs(overworldSize);
        }
        if (netherSize < 0) {
            netherSize = Math.abs(netherSize);
        }

        // If overworld or nether is 0 then ignore
        if ((overworldSize === 0 && player.dimension.id === "minecraft:overworld") || (netherSize === 0 && player.dimension.id === "minecraft:nether")) {
            continue;
        }
        // If the player is in the end then ignore the world border
        if (player.dimension.id === "minecraft:the_end") {
            continue;
        }

        const { x, y, z } = player.location;

        const blockCoords = [
            [x, y - 1, z],
            [x, y - 1, z + 1],
            [x, y - 1, z - 1],
            [x + 1, y - 1, z],
            [x - 1, y - 1, z],
            [x, y, z],
            [x, y, z + 1],
            [x, y, z - 1],
            [x + 1, y, z],
            [x - 1, y, z],
        ];

        const portalBlocks = {};

        for (const [x, y, z] of blockCoords) {
            const block = player.dimension.getBlock(new Vector(x, y, z));
            portalBlocks[`${x},${y},${z}`] = block.typeId ?? "minecraft:air";
        }

        if (portalBlocks[MinecraftBlockTypes.portal.id] || portalBlocks[`${x},${y - 1},${z}`] === MinecraftBlockTypes.air.id) {
            setTimer(player.name);
            continue;
        }

        // Overworld
        if (player.dimension.id === "minecraft:overworld") {
            const border = overworldSize - 3;
            const { x, y, z } = player.location;

            // Make sure nobody climbs over the wall
            if (x > overworldSize || x < -overworldSize || z > overworldSize || z < -overworldSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);

                const teleportToBorder = (x: number, z: number) => {
                    setTimer(player.name);
                    player.teleport(new Vector(x, y, z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, x, y, z);
                    setTimer(player.name);
                    player.teleport(new Vector(x, safe, z), player.dimension, 0, 0);
                };

                if (x >= overworldSize && z >= overworldSize) {
                    teleportToBorder(border, border);
                } else if (x <= -overworldSize && z <= -overworldSize) {
                    teleportToBorder(-border + 6, -border + 6);
                } else if (x >= overworldSize && z <= -overworldSize) {
                    teleportToBorder(border, -border + 6);
                } else if (x <= -overworldSize && z >= overworldSize) {
                    teleportToBorder(-border + 6, border);
                } else if (x >= overworldSize) {
                    teleportToBorder(border, z);
                } else if (z >= overworldSize) {
                    teleportToBorder(x, border);
                } else if (x <= -overworldSize) {
                    teleportToBorder(-border + 6, z);
                } else if (z <= -overworldSize) {
                    teleportToBorder(x, -border + 6);
                }
            }
        }

        // Nether
        if (player.dimension.id === "minecraft:the_nether") {
            const border = netherSize - 3;
            const { x, y, z } = player.location;

            // Make sure nobody climbs over the wall
            if (x > netherSize || x < -netherSize || z > netherSize || z < -netherSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);

                const teleportToBorder = (x: number, z: number) => {
                    setTimer(player.name);
                    player.teleport(new Vector(x, y, z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, x, y, z);
                    setTimer(player.name);
                    player.teleport(new Vector(x, safe, z), player.dimension, 0, 0);
                };

                if (x >= netherSize && z >= netherSize) {
                    teleportToBorder(border, border);
                } else if (x <= -netherSize && z <= -netherSize) {
                    teleportToBorder(-border + 6, -border + 6);
                } else if (x >= netherSize && z <= -netherSize) {
                    teleportToBorder(border, -border + 6);
                } else if (x <= -netherSize && z >= netherSize) {
                    teleportToBorder(-border + 6, border);
                } else if (x >= netherSize) {
                    teleportToBorder(border, z);
                } else if (z >= netherSize) {
                    teleportToBorder(x, border);
                } else if (x <= -netherSize) {
                    teleportToBorder(-border + 6, z);
                } else if (z <= -netherSize) {
                    teleportToBorder(x, -border + 6);
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
export function WorldBorder() {
    const worldborderId = system.runInterval(() => {
        worldborder(worldborderId);
    });
}
