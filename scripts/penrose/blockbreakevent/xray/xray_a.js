import * as Minecraft from "mojang-minecraft";
import { xrayblocks } from "../../../data/xray.js";
import { disabler } from "../../../util.js";

const World = Minecraft.world;

const XrayA = () => {
    World.events.blockBreak.subscribe(datablock => {
        let player = datablock.player;
        let blocks = datablock.brokenBlockPermutation.type.id;
        let posx = datablock.player.location.x;
        let posy = datablock.player.location.y;
        let posz = datablock.player.location.z;

        if (xrayblocks.includes(blocks) && !player.hasTag('paradoxOpped')) {
            try{
                datablock.player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r §4[Xray]§r ${disabler(player.nameTag).replace("\"", "").replace("\\", "")}§6 has found §r1x ${blocks.replace("minecraft:", "")}§6 at X= §r${posx.toFixed(0)}§6 Y= §r${posy.toFixed(0)}§6 Z= §r${posz.toFixed(0)}."}]}`);
            } catch(error) {}
        }
    });
};

export { XrayA };