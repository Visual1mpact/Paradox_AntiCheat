import { MinecraftBlockTypes, Player, world, system, Vector } from "@minecraft/server";
import { sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

// Make sure they don't tp inside a solid block
function safetyProtocol(player: Player, x: number, y: number, z: number) {
    const blockVerification = parseInt(y.toFixed(0)) - 1;
    let safe: number;
    for (let i = blockVerification; i < blockVerification + 100; i++) {
        const testAir = player.dimension.getBlock(new Vector(x, i, z));
        if (testAir.typeId == "minecraft:air") {
            safe = testAir.y;
            break;
        }
    }
    if (safe) {
        return safe;
    } else {
        return (safe = y);
    }
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
        const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

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

        // Location of portal block using player location with new instance of BlockLocation
        const test = new Vector(player.location.x, player.location.y, player.location.z);

        // Offset location from player for actual block locations and return string
        let portals = [
            player.dimension.getBlock(new Vector(test.x, test.y - 1, test.z)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x, test.y - 1, test.z + 1)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x, test.y - 1, test.z - 1)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x + 1, test.y - 1, test.z)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x - 1, test.y - 1, test.z)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x, test.y, test.z)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x, test.y, test.z + 1)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x, test.y, test.z - 1)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x + 1, test.y, test.z)).typeId ?? "minecraft:air",
            player.dimension.getBlock(new Vector(test.x - 1, test.y, test.z)).typeId ?? "minecraft:air",
        ];

        /**
         * Ignore until they move away from the portal.
         * This will prevent a loop caused by a conflict with Mojang's proprietary code.
         * I literally can't think of any other solution to work around this problem for now.
         */
        if (MinecraftBlockTypes.portal.id in portals || portals[0] === MinecraftBlockTypes.air.id) {
            continue;
        }

        // Overworld
        if (player.dimension.id === "minecraft:overworld") {
            // Make sure nobody climbs over the wall
            if (player.location.x > overworldSize || player.location.x < -overworldSize || player.location.z > overworldSize || player.location.z < -overworldSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);
                // Positives
                if (player.location.x >= overworldSize && player.location.z >= overworldSize) {
                    player.teleport(new Vector(overworldSize - 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, overworldSize - 3);
                    player.teleport(new Vector(overworldSize - 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -overworldSize && player.location.z <= -overworldSize) {
                    player.teleport(new Vector(-overworldSize + 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Vector(-overworldSize + 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= overworldSize && player.location.z <= -overworldSize) {
                    player.teleport(new Vector(overworldSize - 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Vector(overworldSize - 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -overworldSize && player.location.z >= overworldSize) {
                    player.teleport(new Vector(-overworldSize + 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, overworldSize - 3);
                    player.teleport(new Vector(-overworldSize + 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= overworldSize) {
                    player.teleport(new Vector(overworldSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, player.location.z);
                    player.teleport(new Vector(overworldSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= overworldSize) {
                    player.teleport(new Vector(player.location.x, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, overworldSize - 3);
                    player.teleport(new Vector(player.location.x, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -overworldSize) {
                    player.teleport(new Vector(-overworldSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, player.location.z);
                    player.teleport(new Vector(-overworldSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -overworldSize) {
                    player.teleport(new Vector(player.location.x, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, -overworldSize + 3);
                    player.teleport(new Vector(player.location.x, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
            }
        }

        // Nether
        if (player.dimension.id === "minecraft:nether") {
            // Make sure nobody climbs over the wall
            if (player.location.x > netherSize || player.location.x < -netherSize || player.location.z > netherSize || player.location.z < -netherSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);
                // Positives
                if (player.location.x >= netherSize && player.location.z >= netherSize) {
                    player.teleport(new Vector(netherSize - 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, netherSize - 3);
                    player.teleport(new Vector(netherSize - 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -netherSize && player.location.z <= -netherSize) {
                    player.teleport(new Vector(-netherSize + 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, -netherSize + 3);
                    player.teleport(new Vector(-netherSize + 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= netherSize && player.location.z <= -netherSize) {
                    player.teleport(new Vector(netherSize - 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, -netherSize + 3);
                    player.teleport(new Vector(netherSize - 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -netherSize && player.location.z >= netherSize) {
                    player.teleport(new Vector(-netherSize + 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, netherSize - 3);
                    player.teleport(new Vector(-netherSize + 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= netherSize) {
                    player.teleport(new Vector(netherSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, player.location.z);
                    player.teleport(new Vector(netherSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= netherSize) {
                    player.teleport(new Vector(player.location.x, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, netherSize - 3);
                    player.teleport(new Vector(player.location.x, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -netherSize) {
                    player.teleport(new Vector(-netherSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, player.location.z);
                    player.teleport(new Vector(-netherSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -netherSize) {
                    player.teleport(new Vector(player.location.x, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, -netherSize + 3);
                    player.teleport(new Vector(player.location.x, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
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
