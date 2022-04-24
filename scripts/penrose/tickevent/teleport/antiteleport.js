import { EntityQueryOptions, world, BlockLocation, Location } from "mojang-minecraft";
import { flag, getScore } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function antiteleport() {
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['paradoxOpped'];
    // Check players who are not Opped
    for (let player of World.getPlayers(filter)) {
        // player position that counts 20 ticks /per second
        let {x, y, z} = player.location;

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
        if ((portal0.type.id === "minecraft:portal" || portal0.type.id === "minecraft:end_portal") || (portal1.type.id === "minecraft:portal" || portal1.type.id === "minecraft:end_portal") || (portal2.type.id === "minecraft:portal" || portal2.type.id === "minecraft:end_portal") || (portal3.type.id === "minecraft:portal" || portal3.type.id === "minecraft:end_portal") || (portal4.type.id === "minecraft:portal" || portal4.type.id === "minecraft:end_portal") || (portal5.type.id === "minecraft:portal" || portal5.type.id === "minecraft:end_portal") || (portal6.type.id === "minecraft:portal" || portal6.type.id === "minecraft:end_portal") || (portal7.type.id === "minecraft:portal" || portal7.type.id === "minecraft:end_portal") || (portal8.type.id === "minecraft:portal" || portal8.type.id === "minecraft:end_portal") || (portal9.type.id === "minecraft:portal" || portal9.type.id === "minecraft:end_portal")) {
	player.runCommand(`scoreboard players set @s teleport 25`);
        } else {
	try {
	    player.runCommand(`scoreboard players remove @s[scores={teleport=1..}] teleport 1`);
	} catch (e) {}
        }

        try {
            player.runCommand(`scoreboard players set @s[tag=wasdead] teleport 25`);
            player.runCommand(`tag @s[tag=wasdead,tag=moving] remove wasdead`);
        } catch (e) {}

        // Only check x and z coordinates for now. If they teleport then its extremely likely one of those two will change.
        if (xPos > config.modules.antiTeleport.constraint || zPos > config.modules.antiTeleport.constraint || xPos < -config.modules.antiTeleport.constraint || zPos < -config.modules.antiTeleport.constraint) {
            if (!player.hasTag('safeteleport') && (portal5.type.id == "minecraft:air")) {
	    try {
	        player.runCommand(`scoreboard players add @s[tag=!safeteleport,scores={teleport=0}] tpvl 1`)
	        player.runCommand(`execute @s[tag=!safeteleport,scores={teleport=0}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(Movement) §4Teleport/A. VL= "},{"score":{"name":"@s","objective":"tpvl"}}]}`)
	        player.runCommand(`tp @s[tag=!safeteleport,scores={teleport=0}] ${xScore} ${yScore} ${zScore}`)
	    } catch (e) {}
            }
        }
    }
}

const AntiTeleport = () => {
    World.events.tick.subscribe(antiteleport);
};

export { AntiTeleport }