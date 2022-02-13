import { setTickTimeout } from "../../../timer/scheduling.js";

// This is to allow passing between functions
let player;

// This function will be called when tick event is triggered from the ScaffoldA function
function time() {
    // fix a disabler method
    player.nameTag = player.nameTag.replace("\"", "");
    player.nameTag = player.nameTag.replace("\\", "");
    player.runCommand(`scoreboard players set "${player.nameTag}" bpps 0`); 
};

function ScaffoldA(block) {
    // Get the name of the player who is joining
    player = block.player;

    player.runCommand(`scoreboard players add @s bpps 1`);  
    try {
        player.runCommand(`execute @s[tag=!op,scores={bpps=13..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${block.block.id}) §4Scaffold. VL= "},{"score":{"name":"@s","objective":"cbevl"}}]}`);
        player.runCommand(`tag @a[tag=!op,scores={bpps=13..}] add isBanned`);  
        player.runCommand(`tellraw @a[tag=packetlogger] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r §bRecieved §6BLOCK PLACE§r packet (${block.block.x} ${block.block.y} ${block.block.z}) from: "},{"selector":"@s"},{" §7(type=${block.block.id})"}]}`); 
    } catch (error) {}

    // Subscribe tick event to the time function
    // Delay the function by 1 second
    setTickTimeout(time, 20);
};

export { ScaffoldA };
