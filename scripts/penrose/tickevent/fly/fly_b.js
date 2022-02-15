import * as Minecraft from "mojang-minecraft";
import { getTags } from "../../../util.js";
import { setTickTimeout } from "../../../timer/scheduling.js";

const World = Minecraft.world;

// This is to allow passing between functions
let player;

function time() {
    try {
        player.runCommand(`execute @a[name="${player.nameTag}",scores={fly_timer=6..}] ~~~ detect ~~-1~ air 0 tp @s ~ ~-1 ~ true`);
    } catch (error) {}
}

function FlyB() {
    // Subscribe tick event to the time function
    // Delay the function by 1 second
    setTickTimeout(time, 20);

    // run as each player
    for (player of World.getPlayers()) {
        // fix a disabler method
        player.nameTag = player.nameTag.replace("\"", "");
        player.nameTag = player.nameTag.replace("\\", "");

        // get all tags of the player
        let playerTags = getTags(player);

        // Fun trick here so that we don't false flag /ability @s mayfly true users
        // It works because hacks add y vel to the player to stay in the air, and it stays between 1-3 whereas mayfly will have a steady score of 0
        // Will still false flag sometimes, but that's why we have !fly
        if(Math.abs(player.velocity.y).toFixed(4) != 0.0000) { 
            if(!playerTags.includes('riding') && !playerTags.includes('ground') && !playerTags.includes('gliding') && !playerTags.includes('levitating') && !playerTags.includes('flying')) {
                try {
                    player.runCommand(`execute @a[name="${player.nameTag}"] ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 scoreboard players add @s fly_timer 1`);
                    player.runCommand(`execute @a[name="${player.nameTag}",scores={fly_timer=6..}] ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 scoreboard players add @s flyvl 1`);
                    player.runCommand(`execute @a[name="${player.nameTag}",scores={fly_timer=6..}] ~~~ detect ~~-1~ air 0 execute @s ~~~ detect ~~-2~ air 0 execute @s ~~~ detect ~~-3 ~ air 0 execute @s ~~~ detect ~~-4~ air 0 execute @s ~~~ detect ~~-5~ air 0 tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(Movement) §4Fly/B. VL= "},{"score":{"name":"@s","objective":"flyvl"}}]}`);
                } catch(error) {}
            } else {
                try {
                    player.runCommand(`scoreboard players set @a[name="${player.nameTag}"] fly_timer 0`);
                } catch(error) {}
            }
        }
    }
}

export { FlyB };