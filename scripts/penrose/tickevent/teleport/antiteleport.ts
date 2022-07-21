import { world, BlockLocation, Location } from "mojang-minecraft";
import { crypto, getScore, sendMsg } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function antiteleport() {
    // Get Dynamic Property
    let antiTeleportBoolean = World.getDynamicProperty('antiteleport_b');
    if (antiTeleportBoolean === undefined) {
        antiTeleportBoolean = config.modules.antiTeleport.enabled;
    }
    // Unsubscribe if disabled in-game
    if (antiTeleportBoolean === false) {
        World.events.tick.unsubscribe(antiteleport);
        return;
    }
    // Check players who are not Opped
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
        // player position that counts 20 ticks /per second
        let { x, y, z } = player.location;

        // Check distance based on location/
        // objective is counted once per second
        let xScore = getScore('xPos', player);
        let yScore = getScore('yPos', player);
        let zScore = getScore('zPos', player);
        let xPos = x - xScore;
        // let yPos = parseInt(y - yScore);
        let zPos = z - zScore;

        // Location of portal block using player location with new instance of BlockLocation
        let test = new BlockLocation(x, y, z);

        // Offset location from player for actual block locations and return string
        let portals = [
            player.dimension.getBlock(test.offset(0, -1, 0)).type.id,
            player.dimension.getBlock(test.offset(0, -1, 1)).type.id,
            player.dimension.getBlock(test.offset(0, -1, -1)).type.id,
            player.dimension.getBlock(test.offset(1, -1, 0)).type.id,
            player.dimension.getBlock(test.offset(-1, -1, 0)).type.id,
            player.dimension.getBlock(test.offset(0, 0, 0)).type.id,
            player.dimension.getBlock(test.offset(0, 0, 1)).type.id,
            player.dimension.getBlock(test.offset(0, 0, -1)).type.id,
            player.dimension.getBlock(test.offset(1, 0, 0)).type.id,
            player.dimension.getBlock(test.offset(-1, 0, 0)).type.id
        ];

        // Get score
        let teleportScore = getScore('teleport', player);

        // Verify if the player is in a portal so we don't flag when moving between dimensions
        if (("minecraft:portal" || "minecraft:end_portal" || "minecraft:end_gateway") in portals) {
            player.runCommand(`scoreboard players set @s teleport 25`);
        }

        if (teleportScore >= 1) {
            try {
                player.runCommand(`scoreboard players remove @s teleport 1`);
            } catch (e) { }
        }

        if (player.hasTag('dead')) {
            player.runCommand(`scoreboard players set @s[tag=dead] teleport 25`);
        }

        if (player.hasTag('dead') && player.hasTag('moving')) {
            player.runCommand(`tag @s[tag=dead,tag=moving] remove dead`);
        }

        // Only check x and z coordinates for now. If they teleport then its extremely likely one of those two will change.
        if (xPos > config.modules.antiTeleport.constraint || zPos > config.modules.antiTeleport.constraint || xPos < -config.modules.antiTeleport.constraint || zPos < -config.modules.antiTeleport.constraint) {
            if (portals[5] === "minecraft:air") {
                teleportScore = getScore('teleport', player);
                if (teleportScore === 0) {
                    player.runCommand(`scoreboard players add @s tpvl 1`);
                    player.teleport(new Location(xScore, yScore, zScore), player.dimension, 0, 0);
                    try {
                        sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r ${player.nameTag} §6has failed §7(Movement) §4Teleport/A. VL= ${getScore('tpvl', player)}`);
                    } catch (e) { }
                }
            }
        }
    }
}

const AntiTeleport = () => {
    World.events.tick.subscribe(antiteleport);
};

export { AntiTeleport };
