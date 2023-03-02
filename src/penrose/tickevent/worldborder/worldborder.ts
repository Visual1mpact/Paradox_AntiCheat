import { BlockLocation, Location, MinecraftBlockTypes, Player, world, system } from "@minecraft/server";
import { crypto, sendMsgToPlayer } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

// Make sure they don't tp inside a solid block
function safetyProtocol(player: Player, x: number, y: number, z: number) {
    const blockVerification = parseInt(y.toFixed(0)) - 1;
    let safe: number;
    for (let i = blockVerification; i < blockVerification + 100; i++) {
        const testAir = player.dimension.getBlock(new BlockLocation(x, i, z));
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
        system.clearRunSchedule(id);
        return;
    }
    for (const player of World.getPlayers()) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
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
        const test = new BlockLocation(player.location.x, player.location.y, player.location.z);

        // Offset location from player for actual block locations and return string
        let portals = [
            player.dimension.getBlock(test.offset(0, -1, 0)).typeId,
            player.dimension.getBlock(test.offset(0, -1, 1)).typeId,
            player.dimension.getBlock(test.offset(0, -1, -1)).typeId,
            player.dimension.getBlock(test.offset(1, -1, 0)).typeId,
            player.dimension.getBlock(test.offset(-1, -1, 0)).typeId,
            player.dimension.getBlock(test.offset(0, 0, 0)).typeId,
            player.dimension.getBlock(test.offset(0, 0, 1)).typeId,
            player.dimension.getBlock(test.offset(0, 0, -1)).typeId,
            player.dimension.getBlock(test.offset(1, 0, 0)).typeId,
            player.dimension.getBlock(test.offset(-1, 0, 0)).typeId,
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
                    player.teleport(new Location(overworldSize - 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, overworldSize - 3);
                    player.teleport(new Location(overworldSize - 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -overworldSize && player.location.z <= -overworldSize) {
                    player.teleport(new Location(-overworldSize + 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Location(-overworldSize + 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= overworldSize && player.location.z <= -overworldSize) {
                    player.teleport(new Location(overworldSize - 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Location(overworldSize - 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -overworldSize && player.location.z >= overworldSize) {
                    player.teleport(new Location(-overworldSize + 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, overworldSize - 3);
                    player.teleport(new Location(-overworldSize + 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= overworldSize) {
                    player.teleport(new Location(overworldSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, overworldSize - 3, player.location.y, player.location.z);
                    player.teleport(new Location(overworldSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= overworldSize) {
                    player.teleport(new Location(player.location.x, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, overworldSize - 3);
                    player.teleport(new Location(player.location.x, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -overworldSize) {
                    player.teleport(new Location(-overworldSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -overworldSize + 3, player.location.y, player.location.z);
                    player.teleport(new Location(-overworldSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -overworldSize) {
                    player.teleport(new Location(player.location.x, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, -overworldSize + 3);
                    player.teleport(new Location(player.location.x, safe, -overworldSize + 3), player.dimension, 0, 0);
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
                    player.teleport(new Location(netherSize - 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, netherSize - 3);
                    player.teleport(new Location(netherSize - 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -netherSize && player.location.z <= -netherSize) {
                    player.teleport(new Location(-netherSize + 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, -netherSize + 3);
                    player.teleport(new Location(-netherSize + 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= netherSize && player.location.z <= -netherSize) {
                    player.teleport(new Location(netherSize - 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, -netherSize + 3);
                    player.teleport(new Location(netherSize - 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -netherSize && player.location.z >= netherSize) {
                    player.teleport(new Location(-netherSize + 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, netherSize - 3);
                    player.teleport(new Location(-netherSize + 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= netherSize) {
                    player.teleport(new Location(netherSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, netherSize - 3, player.location.y, player.location.z);
                    player.teleport(new Location(netherSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= netherSize) {
                    player.teleport(new Location(player.location.x, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, netherSize - 3);
                    player.teleport(new Location(player.location.x, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -netherSize) {
                    player.teleport(new Location(-netherSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, -netherSize + 3, player.location.y, player.location.z);
                    player.teleport(new Location(-netherSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -netherSize) {
                    player.teleport(new Location(player.location.x, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    const safe = safetyProtocol(player, player.location.x, player.location.y, -netherSize + 3);
                    player.teleport(new Location(player.location.x, safe, -netherSize + 3), player.dimension, 0, 0);
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
    const worldborderId = system.runSchedule(() => {
        worldborder(worldborderId);
    });
}
