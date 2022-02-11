import * as Minecraft from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const ScaffoldA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");
            player.dimension.runCommand(`scoreboard players set "${player.nameTag}" bpps 0`);  

        }
    }, 20) //Executes every second

    World.events.blockPlace.subscribe(block => {
        block.player.runCommand(`scoreboard players add @s bpps 1`);  
        try {
            block.player.runCommand(`execute @s[tag=op,scores={bpps=13..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${block.block.id}) §4Scaffold. VL= "},{"score":{"name":"@s","objective":"cbevl"}}]}`);
            block.player.runCommand(`tag @a[tag=!op,scores={bpps=13..}] add isBanned`);  
            block.player.runCommand(`tellraw @a[tag=packetlogger] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r §bRecieved §6BLOCK PLACE§r packet (${block.block.x} ${block.block.y} ${block.block.z}) from: "},{"selector":"@s"},{" §7(type=${block.block.id})"}]}`); 
        } catch (error) {}
})
}

export { ScaffoldA }
