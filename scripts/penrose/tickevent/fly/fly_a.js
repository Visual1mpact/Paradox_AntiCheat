import { world, EntityQueryOptions, Location, BlockLocation} from "mojang-minecraft";
import { getScore, disabler } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";

const World = world;

const playersOldCoordinates = new Map();

// Global
let check;
let oldX, oldY, oldZ;
let Block1, Block2, Block3;

function time(player, x, y, z, check) {
    let test = getScore("fly_timer", player);
    let dimension = player.dimension;
    if (test >= 6 && check === 1) {
        player.teleport(new Location(x, y, z), dimension, 0, player.bodyRotation);
    }
    
}

function flya() {
    // Unsubscribe if disabled in-game
    if (config.modules.flyA.enabled === false) {
        World.events.tick.unsubscribe(flya);
        return;
    }
    // Set .gameMode to survival
    let gm = new EntityQueryOptions();
    gm.gameMode = 0;
    // run as each player who are in survival
    for (let player of World.getPlayers(gm)) {

        let test = getScore("fly_timer", player);
        if (check != 1) {
            const playerX = Math.trunc(player.location.x);
            const playerY = Math.trunc(player.location.y);
            const playerZ = Math.trunc(player.location.z);
            playersOldCoordinates.set(disabler(player.nameTag), { x: playerX, y: playerY, z: playerZ });
            const playerCoords = playersOldCoordinates.get(disabler(player.nameTag));
            oldX = playerCoords.x, oldY = playerCoords.y, oldZ = playerCoords.z;
            check = 1;
        }

        // Fun trick here so that we don't false flag /ability @s mayfly true users
        // It works because hacks add y vel to the player to stay in the air, and it stays between 1-3 whereas mayfly will have a steady score of 0
        // Will still false flag sometimes, but that's why we have !fly
        let xyVelocity = Math.hypot(player.velocity.x, player.velocity.y).toFixed(4);
        let zyVelocity = Math.hypot(player.velocity.z, player.velocity.y).toFixed(4);

        try {
            // We want to know if the blocks below the player is air or not
            Block1 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z));
            Block2 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
        } catch (error) {}
        
        if (xyVelocity != 0.0784 || zyVelocity != 0.0784) {
            if (!player.hasTag('paradoxOpped') && !player.hasTag('ground') && !player.hasTag('gliding') && !player.hasTag('levitating') && !player.hasTag('riding') && !player.hasTag('flying') && Block1.type.id === "minecraft:air" && Block2.type.id === "minecraft:air") {
                try {
                    player.runCommand(`scoreboard players add "${disabler(player.nameTag)}" fly_timer 1`);
                } catch (error) {}
                if (test >= 6) {
                    try {
                        player.runCommand(`scoreboard players add "${disabler(player.nameTag)}" flyvl 1`);
                    } catch (error) {}
                    try {
                        player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(Movement) §4Fly/A. VL= "},{"score":{"name":"@s","objective":"flyvl"}}]}`);
                    } catch (error) {}
                }
            } else if (player.hasTag('ground')) {
                try {
                    player.runCommand(`scoreboard players set "${disabler(player.nameTag)}" fly_timer 0`);
                } catch (error) {}
                check = 0;
            }
        }
        // Check the player's status
        time(player, oldX, oldY, oldZ, check);
    }
}

const FlyA = () => {
    // Executes every 1 second
    setTickInterval(() => flya(),20);
};

export { FlyA };