import { BlockLocation, Location, MinecraftBlockTypes, Player, world } from "mojang-minecraft";
import { crypto, sendMsgToPlayer } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

// Make sure they don't tp inside a solid block
function safetyProtocol(player: Player, x: number, y: number, z: number) {
    let blockVerification = parseInt(y.toFixed(0)) - 1;
    let safe: number;
    for (let i = blockVerification; i < blockVerification + 100; i++) {
        let testAir = player.dimension.getBlock(new BlockLocation(x, i, z));
        if (testAir.isEmpty) {
            safe = testAir.y;
            break;
        }
    }
    if (safe) {
        return safe;
    } else {
        return safe = y;
    }
}

function worldborder() {
    // Dynamic Properties for boolean
    let worldBorderBoolean = World.getDynamicProperty('worldborder_b');
    if (worldBorderBoolean === undefined) {
        worldBorderBoolean = config.modules.worldBorder.enabled;
    }
    let antiTeleportBoolean = World.getDynamicProperty('antiteleport_b');
    if (antiTeleportBoolean === undefined) {
        antiTeleportBoolean = config.modules.antiTeleport.enabled;
    }
    // Dynamic Properties for number
    let worldBorderOverworldNumber = World.getDynamicProperty('worldborder_n');
    if (worldBorderOverworldNumber === undefined) {
        worldBorderOverworldNumber = config.modules.worldBorder.overworld;
    }
    let worldBorderNetherNumber = World.getDynamicProperty('worldborder_nether_n');
    if (worldBorderNetherNumber === undefined) {
        worldBorderNetherNumber = config.modules.worldBorder.nether;
    }
    // Unsubscribe if disabled in-game
    if (worldBorderBoolean === false) {
        World.events.tick.unsubscribe(worldborder);
        return;
    }
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty('hash');
        let salt = player.getDynamicProperty('salt');
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) { }
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

        let portalArray: string[];

        if (!portalArray) {
            // Location of portal block
            let portal0 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
            let portal1 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z + 1));
            let portal2 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z - 1));
            let portal3 = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y - 1, player.location.z));
            let portal4 = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y - 1, player.location.z));
            let portal5 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z));
            let portal6 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z + 1));
            let portal7 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z - 1));
            let portal8 = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y, player.location.z));
            let portal9 = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y, player.location.z));

            // Extract conditions to array
            portalArray = [portal0.id, portal1.id, portal2.id, portal3.id, portal4.id, portal5.id, portal6.id, portal7.id, portal8.id, portal9.id];
        }

        /**
         * Ignore until they move away from the portal.
         * This will prevent a loop caused by a conflict with Mojang's proprietary code.
         * I literally can't think of any other solution to work around this problem for now.
         */
        if (portalArray.includes(MinecraftBlockTypes.portal.id) || portalArray[0] === MinecraftBlockTypes.air.id) {
            continue;
        } else {
            portalArray = undefined;
        }

        // Overworld
        if (player.dimension.id === "minecraft:overworld") {
            // Make sure nobody climbs over the wall
            if (player.location.x > overworldSize || player.location.x < -overworldSize || player.location.z > overworldSize || player.location.z < -overworldSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);
                // Positives
                if (player.location.x >= overworldSize && player.location.z >= overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(overworldSize - 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, overworldSize - 3, player.location.y, overworldSize - 3);
                    player.teleport(new Location(overworldSize - 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -overworldSize && player.location.z <= -overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-overworldSize + 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -overworldSize + 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Location(-overworldSize + 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= overworldSize && player.location.z <= -overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(overworldSize - 3, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, overworldSize - 3, player.location.y, -overworldSize + 3);
                    player.teleport(new Location(overworldSize - 3, safe, -overworldSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -overworldSize && player.location.z >= overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-overworldSize + 3, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -overworldSize + 3, player.location.y, overworldSize - 3);
                    player.teleport(new Location(-overworldSize + 3, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(overworldSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, overworldSize - 3, player.location.y, player.location.z);
                    player.teleport(new Location(overworldSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(player.location.x, player.location.y, overworldSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, player.location.x, player.location.y, overworldSize - 3);
                    player.teleport(new Location(player.location.x, safe, overworldSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-overworldSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -overworldSize + 3, player.location.y, player.location.z);
                    player.teleport(new Location(-overworldSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -overworldSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(player.location.x, player.location.y, -overworldSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, player.location.x, player.location.y, -overworldSize + 3);
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
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(netherSize - 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, netherSize - 3, player.location.y, netherSize - 3);
                    player.teleport(new Location(netherSize - 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negatives
                if (player.location.x <= -netherSize && player.location.z <= -netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-netherSize + 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -netherSize + 3, player.location.y, -netherSize + 3);
                    player.teleport(new Location(-netherSize + 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x and negative z
                if (player.location.x >= netherSize && player.location.z <= -netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(netherSize - 3, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, netherSize - 3, player.location.y, -netherSize + 3);
                    player.teleport(new Location(netherSize - 3, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x and positive z
                if (player.location.x <= -netherSize && player.location.z >= netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-netherSize + 3, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -netherSize + 3, player.location.y, netherSize - 3);
                    player.teleport(new Location(-netherSize + 3, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Postive x
                if (player.location.x >= netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(netherSize - 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, netherSize - 3, player.location.y, player.location.z);
                    player.teleport(new Location(netherSize - 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Positive z
                if (player.location.z >= netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(player.location.x, player.location.y, netherSize - 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, player.location.x, player.location.y, netherSize - 3);
                    player.teleport(new Location(player.location.x, safe, netherSize - 3), player.dimension, 0, 0);
                    break;
                }
                // Negative x
                if (player.location.x <= -netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(-netherSize + 3, player.location.y, player.location.z), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, -netherSize + 3, player.location.y, player.location.z);
                    player.teleport(new Location(-netherSize + 3, safe, player.location.z), player.dimension, 0, 0);
                    break;
                }
                // Negative z
                if (player.location.z <= -netherSize) {
                    if (antiTeleportBoolean) {
                        player.runCommand(`scoreboard players set @s teleport 25`);
                    }
                    player.teleport(new Location(player.location.x, player.location.y, -netherSize + 3), player.dimension, 0, 0);
                    let safe = safetyProtocol(player, player.location.x, player.location.y, -netherSize + 3);
                    player.teleport(new Location(player.location.x, safe, -netherSize + 3), player.dimension, 0, 0);
                    break;
                }
            }
        }
    }
}

const WorldBorder = () => {
    World.events.tick.subscribe(worldborder);
};

export { WorldBorder };