import { BlockBreakEvent, world } from "mojang-minecraft";
import { xrayblocks } from "../../../data/xray.js";
import { crypto, sendMsg } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function xraya(object: BlockBreakEvent) {
    // Get Dynamic Property
    let xrayBoolean = World.getDynamicProperty('xraya_b');
    if (xrayBoolean === undefined) {
        xrayBoolean = config.modules.xrayA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (xrayBoolean === false) {
        World.events.blockBreak.unsubscribe(xraya);
        return;
    }

    // Properties from class
    let { player, brokenBlockPermutation } = object;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // Player coordinates
    let { x, y, z } = player.location;

    if (xrayblocks.includes(brokenBlockPermutation.type.id)) {
        sendMsg(`@a[tag=notify]`, `§r§4[§6Paradox§4]§r §4[Xray]§r ${player.nameTag}§r§6 has found §r1x ${brokenBlockPermutation.type.id.replace("minecraft:", "")}§6 at X=§r${x.toFixed(0)}§6 Y=§r${y.toFixed(0)}§6 Z=§r${z.toFixed(0)}.`);
    }
}

const XrayA = () => {
    World.events.blockBreak.subscribe(xraya);
};

export { XrayA };