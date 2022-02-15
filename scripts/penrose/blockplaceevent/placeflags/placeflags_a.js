import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";

const World = Minecraft.world;

const PlaceflagsA = () => {
    World.events.blockPlace.subscribe(block => {
        if(illegalitems.includes(block.block.id)) {
            block.player.runCommand(`scoreboard players add @s[tag=!op] cbevl 1`);
            try {
                block.player.runCommand(`execute @s[tag=!op] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${block.block.id}) §4CBE. VL= "},{"score":{"name":"@s","objective":"cbevl"}}]}`);
            } catch(error) {}
            block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air`);
        }
    });
};

export { PlaceflagsA };
