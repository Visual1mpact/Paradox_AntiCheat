import { world, EntityQueryOptions, Location, BlockLocation, Block} from "mojang-minecraft";
import { getScore, flag, crypto } from "../../../util.js";
import { clearTickInterval, setTickInterval } from "../../../misc/scheduling.js";
import config from "../../../data/config.js";

const World = world;

let playersOldCoordinates = new Map();

function flya(id: number) {
    // Get Dynamic Property
    let flyABoolean = World.getDynamicProperty('flya_b');
    if (flyABoolean === undefined) {
        flyABoolean = config.modules.flyA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (flyABoolean === false) {
        clearTickInterval(id);
        return;
    }

    // Exclude creative gamemode
    let gm = new EntityQueryOptions();
    gm.excludeGameModes = [1];
    // run as each player who are in survival
    for (let player of World.getPlayers(gm)) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty('hash');
        let salt = player.getDynamicProperty('salt');
        let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }

        let test = getScore("fly_timer", player);

        // Fun trick here so that we don't false flag /ability @s mayfly true users
        // It works because hacks add y vel to the player to stay in the air, and it stays between 1-3 whereas mayfly will have a steady score of 0
        // Will still false flag sometimes, but that's why we have !fly
        let xyVelocity = Math.hypot(player.velocity.x, player.velocity.y).toFixed(4);
        let zyVelocity = Math.hypot(player.velocity.z, player.velocity.y).toFixed(4);

        let Block: Block, Block1: Block, Block2: Block;
        try {
            // We want to know if the blocks below the player is air or not
            Block = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z));
            Block1 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
            Block2 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 2, player.location.z));
        } catch (error) {}

        let oldX: number, oldY: number, oldZ: number;
        if (player.hasTag('ground')) {
            let playerX = Math.trunc(player.location.x);
            let playerY = Math.trunc(player.location.y);
            let playerZ = Math.trunc(player.location.z);
            playersOldCoordinates.set((player.name), { x: playerX, y: playerY, z: playerZ });
        }
        let playerCoords = playersOldCoordinates.get(player.name);
        try {
            // Use try/catch because this will return undefined when player is loading in
            oldX = playerCoords.x, oldY = playerCoords.y, oldZ = playerCoords.z;
        } catch (error) {}
        
        if (Number(xyVelocity) != 0.0784 || Number(zyVelocity) != 0.0784) {
            if (!player.hasTag('ground') && !player.hasTag('gliding') && !player.hasTag('levitating') && !player.hasTag('riding') && !player.hasTag('flying') && !player.hasTag('swimming') && Block.type.id === "minecraft:air" && Block1.type.id === "minecraft:air" && Block2.type.id === "minecraft:air") {
                try {
                    player.runCommand(`scoreboard players add @s fly_timer 1`);
                } catch (error) {}
                if (test >= 6) {
                    try {
                        // Use try/catch since variables for cords could return undefined if player is loading in
                        // and they meet the conditions. An example is them flagging this, logging off, then logging
                        // back on again.
                        player.teleport(new Location(oldX, oldY, oldZ), player.dimension, 0, 0);
                    } catch (error) {}
                    flag(player, "Fly", "A", "Exploit", null, null, null, null, false, null);
                }
            } else if (player.hasTag('ground')) {
                try {
                    player.runCommand(`scoreboard players set @s fly_timer 0`);
                } catch (error) {}
            }
        }
    }
}

const FlyA = () => {
    // Executes every 1 second
    const id = setTickInterval(() => flya(id), 20);
};

export { FlyA };