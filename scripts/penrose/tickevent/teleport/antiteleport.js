import { world } from "mojang-minecraft";
import { setTickInterval } from "../../../timer/scheduling.js";
import { flag, getScore } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

const AntiTeleport = () => {
    setTickInterval(() => {
        let x1;
        let y1;
        let z1;
        let xVar;
        let yVar;
        let zVar;
        for (let player of World.getPlayers()) {
            // player position
            x1 = Math.abs(player.location.x);
            y1 = Math.abs(player.location.y);
            z1 = Math.abs(player.location.z);

            xVar = Math.abs(x1 - Math.abs(getScore('xPos', player))).toFixed(0);
            yVar = Math.abs(y1 - Math.abs(getScore('yPos', player))).toFixed(0);
            zVar = Math.abs(z1 - Math.abs(getScore('zPos', player))).toFixed(0);

            if (xVar > config.modules.antiTeleport.constraint|| yVar > config.modules.antiTeleport.constraint + config.modules.antiTeleport.constraint * Math.abs(player.velocity.y).toFixed(0) || zVar > config.modules.antiTeleport.constraint) {
                flag(player, "AntiTeleport", "A", "Movement", false ,false, true, false);
           }
        }
    });
};

export { AntiTeleport };