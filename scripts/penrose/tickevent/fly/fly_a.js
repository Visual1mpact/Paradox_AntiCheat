import * as Minecraft from "mojang-minecraft";
import { getScore } from "../../../util.js";

const World = Minecraft.world;

const playersOldCoordinates = new Map();

// This is to allow passing between functions
let oldX;
let oldY;
let oldZ;
let check;

function time(player, x, y, z) {
    let test = getScore("fly_timer", player);
    let dimension = player.dimension;
    if (test >= 6 && check === 1) {
        player.teleport(new Minecraft.Location(x, y, z), dimension, 0, player.bodyRotation);
    }
    
}

function FlyA() {
    // Set .gameMode to survival
    let gm = new Minecraft.EntityQueryOptions();
    gm.gameMode = 0;
    // run as each player who are in survival
    for (let player of World.getPlayers(gm)) {
        // fix a disabler method
        player.nameTag = player.nameTag.replace("\"", "");
        player.nameTag = player.nameTag.replace("\\", "");

        let test = getScore("fly_timer", player);

        if (check != 1) {
            const playerX = Math.trunc(player.location.x);
            const playerY = Math.trunc(player.location.y);
            const playerZ = Math.trunc(player.location.z);
            playersOldCoordinates.set(player.nameTag, { x: playerX, y: playerY, z: playerZ });
            const playerCoords = playersOldCoordinates.get(player.nameTag);
            oldX = playerCoords.x, oldY = playerCoords.y, oldZ = playerCoords.z;
            check = 1;
        }

        // Fun trick here so that we don't false flag /ability @s mayfly true users
        // It works because hacks add y vel to the player to stay in the air, and it stays between 1-3 whereas mayfly will have a steady score of 0
        // Will still false flag sometimes, but that's why we have !fly
        let xyVelocity = Math.hypot(player.velocity.x, player.velocity.y).toFixed(4);
        let zyVelocity = Math.hypot(player.velocity.z, player.velocity.y).toFixed(4);
        
        if(xyVelocity != 0.0784 || zyVelocity != 0.0784) {
            if(!player.hasTag('paradoxOpped') && !player.hasTag('ground') && !player.hasTag('gliding') && !player.hasTag('levitating') && !player.hasTag('riding') && !player.hasTag('flying')) {
                try {
                    player.runCommand(`execute @s ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 scoreboard players add @s fly_timer 1`);
                } catch (error) {}
                if (test >= 6) {
                    try {
                        player.runCommand(`execute @s ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 scoreboard players add @s flyvl 1`);
                    } catch (error) {}
                    try {
                        player.runCommand(`execute @s ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(Movement) §4Fly/A. VL= "},{"score":{"name":"@s","objective":"flyvl"}}]}`);
                    } catch(error) {}
                }
            } else {
                try {
                    player.runCommand(`scoreboard players set "${player.nameTag}" fly_timer 0`);
                } catch(error) {}
                check = 0;
            }
        }
        // Check the player's status
        time(player, oldX, oldY, oldZ);
    }
}

export { FlyA };