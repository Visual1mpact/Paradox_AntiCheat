import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";

const World = Minecraft.world;

function placeflagsa(block) {
    // Unsubscribe if disabled in-game
    if (config.modules.placeflagsA.enabled === false) {
        World.events.blockPlace.unsubscribe(placeflagsa);
        return;
    }
    if(illegalitems.includes(block.block.id) && !block.player.hasTag('paradoxOpped')) {
        try {
            block.player.runCommand(`scoreboard players add @s[tag=!paradoxOpped] cbevl 1`);
        } catch (error) {}
        try {
            block.player.runCommand(`execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(${block.block.id}) §4CBE. VL= "},{"score":{"name":"@s","objective":"cbevl"}}]}`);
        } catch(error) {}
        block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air`);
    }
}

const PlaceflagsA = () => {
    World.events.blockPlace.subscribe(block => placeflagsa(block));
};

export { PlaceflagsA };
