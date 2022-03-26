import { world } from "mojang-minecraft";
import { xrayblocks } from "../../../data/xray.js";
import { disabler } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function xraya(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.xrayA.enabled === false) {
        World.events.blockBreak.unsubscribe(xraya);
        return;
    }

    // Properties from class
    let { player, brokenBlockPermutation } = object;
    // Player coordinates
    let { x, y, z } = player.location;

    if (xrayblocks.includes(brokenBlockPermutation.type.id) && !player.hasTag('paradoxOpped')) {
        try{
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r §4[Xray]§r ${disabler(player.nameTag)}§6 has found §r1x ${brokenBlockPermutation.type.id.replace("minecraft:", "")}§6 at X=§r${x.toFixed(0)}§6 Y=§r${y.toFixed(0)}§6 Z=§r${z.toFixed(0)}."}]}`);
        } catch(error) {}
    }
}

const XrayA = () => {
    World.events.blockBreak.subscribe(object => xraya(object));
};

export { XrayA };