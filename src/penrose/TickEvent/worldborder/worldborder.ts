import { Player, world, system } from "@minecraft/server";
import { MinecraftBlockTypes } from "../../../node_modules/@minecraft/vanilla-data/lib/index";
import { sendMsgToPlayer, setTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

// Make sure they don't tp inside a solid block
function safetyProtocol(player: Player, x: number, y: number, z: number) {
    const testPositions = [
        { x: x, y: y + 1, z: z }, // Head position
        { x: x, y: y, z: z }, // Body position
        { x: x, y: y - 1, z: z }, // Feet position
    ];

    let safe = null;
    let consecutiveAir = 0;

    for (const position of testPositions) {
        const block = player.dimension.getBlock(position);
        if (block?.isAir) {
            consecutiveAir++;
        } else {
            consecutiveAir = 0;
        }
    }

    if (consecutiveAir === testPositions.length) {
        safe = testPositions[0].y;
    } else {
        safe = y;
    }

    return safe;
}

function worldborder(id: number) {
    // Dynamic Properties for boolean
    const worldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");

    // Dynamic Properties for number
    const worldBorderOverworldNumber = dynamicPropertyRegistry.get("worldborder_n");
    const worldBorderNetherNumber = dynamicPropertyRegistry.get("worldborder_nether_n");
    const worldBorderEndNumber = dynamicPropertyRegistry.get("worldborder_end_n");

    // Unsubscribe if disabled in-game
    if (worldBorderBoolean === false) {
        system.clearRun(id);
        return;
    }
    const players = world.getPlayers();
    for (const player of players) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        // What is it currently set to
        let overworldSize = worldBorderOverworldNumber as number;
        let netherSize = worldBorderNetherNumber as number;
        let endSize = worldBorderEndNumber as number;

        // Make sure it's not a negative
        if (overworldSize < 0) {
            overworldSize = Math.abs(overworldSize);
        }
        if (netherSize < 0) {
            netherSize = Math.abs(netherSize);
        }
        if (endSize < 0) {
            endSize = Math.abs(endSize);
        }

        // If overworld or nether is 0 then ignore
        if ((overworldSize === 0 && player.dimension.id === "minecraft:overworld") || (netherSize === 0 && player.dimension.id === "minecraft:nether") || (endSize === 0 && player.dimension.id === "minecraft:the_end")) {
            continue;
        }

        const { x, y, z } = player.location;

        const blockCoords: [number, number, number][] = [
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

        const portalBlocks: { [key: string]: string } = {};

        for (const [x, y, z] of blockCoords) {
            const block = player.dimension.getBlock({ x: x, y: y, z: z });
            portalBlocks[`${x},${y},${z}`] = block?.typeId ?? "minecraft:air";
        }

        if (portalBlocks[MinecraftBlockTypes.Portal] || portalBlocks[`${x},${y - 1},${z}`] === MinecraftBlockTypes.Air) {
            setTimer(player.id);
            continue;
        }

        // Overworld
        if (player.dimension.id === "minecraft:overworld") {
            const border = overworldSize - 3;
            const { x, y, z } = player.location;

            // Make sure nobody climbs over the wall
            if (x > overworldSize || x < -overworldSize || z > overworldSize || z < -overworldSize) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have reached the world border.`);

                const teleportToBorder = (x: number, z: number) => {
                    const safe = safetyProtocol(player, x, y, z);
                    setTimer(player.id);
                    player.teleport({ x: x, y: safe, z: z }, { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
                };

                const targetX = x < -overworldSize ? -border + 6 : x >= overworldSize ? border - 6 : x;
                const targetZ = z < -overworldSize ? -border + 6 : z >= overworldSize ? border - 6 : z;
                teleportToBorder(targetX, targetZ);
            }
        }

        // Nether
        if (player.dimension.id === "minecraft:nether") {
            const border = netherSize - 3;
            const { x, y, z } = player.location;

            // Make sure nobody climbs over the wall
            if (x > netherSize || x < -netherSize || z > netherSize || z < -netherSize) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have reached the world border.`);

                const teleportToBorder = (x: number, z: number) => {
                    const safe = safetyProtocol(player, x, y, z);
                    setTimer(player.id);
                    player.teleport({ x: x, y: safe, z: z }, { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
                };

                const targetX = x < -netherSize ? -border + 6 : x >= netherSize ? border - 6 : x;
                const targetZ = z < -netherSize ? -border + 6 : z >= netherSize ? border - 6 : z;
                teleportToBorder(targetX, targetZ);
            }
        }

        // Nether
        if (player.dimension.id === "minecraft:the_end") {
            const border = endSize - 3;
            const { x, y, z } = player.location;

            // Make sure nobody climbs over the wall
            if (x > endSize || x < -endSize || z > endSize || z < -endSize) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have reached the world border.`);

                const teleportToBorder = (x: number, z: number) => {
                    const safe = safetyProtocol(player, x, y, z);
                    setTimer(player.id);
                    player.teleport({ x: x, y: safe, z: z }, { dimension: player.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
                };

                const targetX = x < -endSize ? -border + 6 : x >= endSize ? border - 6 : x;
                const targetZ = z < -endSize ? -border + 6 : z >= endSize ? border - 6 : z;
                teleportToBorder(targetX, targetZ);
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
    }, 20);
}
