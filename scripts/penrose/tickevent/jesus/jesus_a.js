import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";

const World = Minecraft.world;

let BlockAtPlayer1;
let BlockAtPlayer2;
let BlockAtPlayer3;

const _player = {
    count: 0
};

function timer(player, dimension, x, y, z) {
    player.teleport(new Minecraft.Location(x, y - 2, z), dimension, 0, player.bodyRotation);
    flag(player, "Jesus", "A", "Movement", false, false, false, false);
    _player.count = 0;
}

const JesusA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            const x = Math.floor(player.location.x);
            const y = Math.floor(player.location.y);
            const z = Math.floor(player.location.z);
            const dimension = player.dimension;
            try {
                // Below player
                BlockAtPlayer1 = player.dimension.getBlock(new Minecraft.BlockLocation(x, y, z));
                // Mid player
                BlockAtPlayer2 = player.dimension.getBlock(new Minecraft.BlockLocation(x, y + 1, z));
                // Above player
                BlockAtPlayer3 = player.dimension.getBlock(new Minecraft.BlockLocation(x, y + 2, z));
            } catch (error) {}

            if (!player.hasTag('paradoxOpped') && !player.hasTag('vanish') && !player.hasTag('swimming') && !player.hasTag('riding') && !player.hasTag('flying') && BlockAtPlayer1.type.id === "minecraft:water" && BlockAtPlayer3.type.id != "minecraft:water" && BlockAtPlayer2.type.id != "minecraft:water" || !player.hasTag('paradoxOpped') && !player.hasTag('vanish') && !player.hasTag('swimming') && !player.hasTag('riding') && !player.hasTag('flying') && BlockAtPlayer1.type.id === "minecraft:lava" && BlockAtPlayer3.type.id != "minecraft:lava" && BlockAtPlayer2.type.id != "minecraft:lava") {
                _player.count++;
                // Flag them after 4 seconds of activity
                if (_player.count === 2) {
                    timer(player, dimension, x, y, z);
                }
            }
            // Reset count
            if (player.hasTag('ground')) {
                _player.count = 0;
            }
        }
    }, 20); // Executes every 2 seconds
};

export { JesusA };