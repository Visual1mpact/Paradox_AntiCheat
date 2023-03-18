import { world, Block, Player, Dimension, system, Vector } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

let BlockAtPlayer0: Block;
let BlockAtPlayer1: Block;

const _player = {
    count: 0,
};

function timer(player: Player, dimension: Dimension, x: number, y: number, z: number) {
    player.teleport(new Vector(x, y - 2, z), dimension, 0, 0);
    _player.count = 0;
}

function jesusa(id: number) {
    // Get Dynamic Property
    const jesusaBoolean = dynamicPropertyRegistry.get("jesusa_b");

    // Unsubscribe if disabled in-game
    if (jesusaBoolean === false) {
        system.clearRun(id);
        return;
    }
    // run as each player
    for (const player of world.getPlayers()) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }
        const x = Math.floor(player.location.x);
        const y = Math.floor(player.location.y);
        const z = Math.floor(player.location.z);
        const dimension = player.dimension;
        try {
            // Below Below player
            BlockAtPlayer0 = player.dimension.getBlock(new Vector(x, y - 1, z));
            // Below player
            BlockAtPlayer1 = player.dimension.getBlock(new Vector(x, y, z));
        } catch (error) {}

        if (
            (!player.hasTag("vanish") && !player.hasTag("swimming") && !player.hasTag("riding") && !player.hasTag("flying") && BlockAtPlayer1.type.id === "minecraft:water" && BlockAtPlayer0.type.id === "minecraft:water") ||
            (!player.hasTag("vanish") && !player.hasTag("swimming") && !player.hasTag("riding") && !player.hasTag("flying") && BlockAtPlayer1.type.id === "minecraft:lava" && BlockAtPlayer0.type.id === "minecraft:lava")
        ) {
            _player.count++;
            // Flag them after 2 seconds of activity
            if (_player.count === 1) {
                timer(player, dimension, x, y, z);
            }
        }
        // Reset count
        if (player.hasTag("ground")) {
            _player.count = 0;
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function JesusA() {
    const jesusAId = system.runInterval(() => {
        jesusa(jesusAId);
    }, 20);
}
