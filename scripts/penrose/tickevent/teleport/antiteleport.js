import { EntityQueryOptions, world, BlockLocation, Location } from "mojang-minecraft";
import { getScore } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function antiteleport() {
    // Unsubscribe if disabled in-game
    if (config.modules.antiTeleport.enabled === false) {
        World.events.tick.unsubscribe(antiteleport);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['paradoxOpped'];
    // Check players who are not Opped
    for (let player of World.getPlayers(filter)) {
        // player position that counts 20 ticks /per second
        let {x, y, z} = player.location;

        // Teleport score
        let teleportScore;

        // Check distance based on location/
        // objective is counted once per second
        let xScore = getScore('xPos', player);
        let yScore = getScore('yPos', player);
        let zScore = getScore('zPos', player);
        let xPos = parseInt(x - xScore);
        // let yPos = parseInt(y - yScore);
        let zPos = parseInt(z - zScore);
        
        // Location of portal block
        let portal0 = player.dimension.getBlock(new BlockLocation(x, y - 1, z));
        let portal1 = player.dimension.getBlock(new BlockLocation(x, y - 1, z + 1));
        let portal2 = player.dimension.getBlock(new BlockLocation(x, y - 1, z - 1));
        let portal3 = player.dimension.getBlock(new BlockLocation(x + 1, y - 1, z));
        let portal4 = player.dimension.getBlock(new BlockLocation(x - 1, y - 1, z));
        let portal5 = player.dimension.getBlock(new BlockLocation(x, y, z));
        let portal6 = player.dimension.getBlock(new BlockLocation(x, y, z + 1));
        let portal7 = player.dimension.getBlock(new BlockLocation(x, y, z - 1));
        let portal8 = player.dimension.getBlock(new BlockLocation(x + 1, y, z));
        let portal9 = player.dimension.getBlock(new BlockLocation(x - 1, y, z));

        // Verify if the player is in a portal so we don't flag when moving between dimensions
        teleportScore = getScore('teleport', player);
        if ((portal0.type.id === "minecraft:portal" || portal0.type.id === "minecraft:end_portal") || (portal1.type.id === "minecraft:portal" || portal1.type.id === "minecraft:end_portal") || (portal2.type.id === "minecraft:portal" || portal2.type.id === "minecraft:end_portal") || (portal3.type.id === "minecraft:portal" || portal3.type.id === "minecraft:end_portal") || (portal4.type.id === "minecraft:portal" || portal4.type.id === "minecraft:end_portal") || (portal5.type.id === "minecraft:portal" || portal5.type.id === "minecraft:end_portal") || (portal6.type.id === "minecraft:portal" || portal6.type.id === "minecraft:end_portal") || (portal7.type.id === "minecraft:portal" || portal7.type.id === "minecraft:end_portal") || (portal8.type.id === "minecraft:portal" || portal8.type.id === "minecraft:end_portal") || (portal9.type.id === "minecraft:portal" || portal9.type.id === "minecraft:end_portal")) {
            player.runCommand(`scoreboard players set @s teleport 25`);
        } else if (teleportScore >= 1) {
            try {
                player.runCommand(`scoreboard players remove @s teleport 1`);
            } catch (e) {}
        }

        try {
            player.runCommand(`scoreboard players set @s[tag=dead] teleport 25`);
            player.runCommand(`tag @s[tag=dead,tag=moving] remove dead`);
        } catch (e) {}

        // Only check x and z coordinates for now. If they teleport then its extremely likely one of those two will change.
        if (xPos > config.modules.antiTeleport.constraint || zPos > config.modules.antiTeleport.constraint || xPos < -config.modules.antiTeleport.constraint || zPos < -config.modules.antiTeleport.constraint) {
            if (portal5.type.id === "minecraft:air") {
                teleportScore = getScore('teleport', player);
                if (teleportScore === 0) {
                    player.runCommand(`scoreboard players add @s tpvl 1`);
                    player.teleport(new Location(xScore, yScore, zScore), player.dimension, 0, player.bodyRotation);
                    try {
                        player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has failed §7(Movement) §4Teleport/A. VL= "},{"score":{"name":"@s","objective":"tpvl"}}]}`);
                    } catch (e) {}
                }
            }
        }
    }
}

const AntiTeleport = () => {
    World.events.tick.subscribe(() => antiteleport());
};

export { AntiTeleport }
