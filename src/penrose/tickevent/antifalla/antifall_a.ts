import { world, Player, Block, EntityQueryOptions, GameMode, system, BlockLocation, BlockType, MinecraftBlockTypes } from "@minecraft/server";
import config from "../../../data/config.js";
import { getScore, flag, crypto, setScore } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
const World = world;

function antifalla(id: number) {
    // Get Dynamic Property
    const antifallABoolean = dynamicPropertyRegistry.get("antifalla_b");

    // Unsubscribe if disabled in-game
    if (antifallABoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    //exclude players who are in creative.
    const gm = new Object() as EntityQueryOptions;
    gm.excludeGameModes = [GameMode.creative];
    for (const player of World.getPlayers(gm)) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            return;
        }
        const vy = player.velocity.y;
        let CenBlockX: Block, CenBlockXTopLeft: Block, CenBlockXTopRight: Block, CenBlockXBottomLeft: Block, CenBlockXBottomRight: Block, NegBlockX: Block, PosBlockX: Block, CenBlockZ: Block, NegBlockZ: Block, PosBlockZ: Block;
        CenBlockX = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
        PosBlockX = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y - 1, player.location.z));
        NegBlockX = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y - 1, player.location.z));
        CenBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
        PosBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z + 1));
        NegBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z - 1));
        // if the player is in any corner of the block we move the block back to the center before hand and test for air
        CenBlockXTopLeft = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y - 1, player.location.z + 1));
        CenBlockXTopRight = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y - 1, player.location.z - 1));
        CenBlockXBottomLeft = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y - 1, player.location.z + 1));
        CenBlockXBottomRight = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y - 1, player.location.z - 1));
        //we know that the NoFall hack keeps the players Velocity set to 0 at all times we can check for this while the player has air blocks and are not standing on a block or its edges etc.
        if (
            CenBlockX.typeId == "minecraft:air" &&
            PosBlockX.typeId == "minecraft:air" &&
            NegBlockX.typeId == "minecraft:air" &&
            CenBlockZ.typeId == "minecraft:air" &&
            PosBlockZ.typeId == "minecraft:air" &&
            NegBlockZ.typeId == "minecraft:air" &&
            CenBlockXTopLeft.typeId == "minecraft:air" &&
            CenBlockXTopRight.typeId == "minecraft:air" &&
            CenBlockXBottomLeft.typeId == "minecraft:air" &&
            CenBlockXBottomRight.typeId == "minecraft:air" &&
            vy == 0
        ) {
            //flag it as a hack and not a movement hack due to issues with flya.

            flag(player, "AntiFall", "A", "Exploit", null, null, null, null, false, null);
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function AntiFallA() {
    const antiFallAId = system.runSchedule(() => {
        antifalla(antiFallAId);
    }, 10);
}
