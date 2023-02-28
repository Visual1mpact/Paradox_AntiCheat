import { world, Player, Block, EntityQueryOptions, GameMode, system, BlockLocation } from "@minecraft/server";
import { getScore, flag, crypto, setScore } from "../../../util.js";
const World = world;

function antifalla(id: number) {
    let gm = new Object() as EntityQueryOptions;

    gm.excludeGameModes = [GameMode.creative];
    for (let player of World.getPlayers(gm)) {
        let vy = player.velocity.y;
        let Block: Block;

        let CenBlockX: Block, NegBlockX: Block, PosBlockX: Block, CenBlockZ: Block, NegBlockZ: Block, PosBlockZ: Block;

        Block = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z));
        CenBlockX = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
        PosBlockX = player.dimension.getBlock(new BlockLocation(player.location.x + 1, player.location.y - 1, player.location.z));
        NegBlockX = player.dimension.getBlock(new BlockLocation(player.location.x - 1, player.location.y - 1, player.location.z));
        CenBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
        PosBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z + 1));
        NegBlockZ = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z - 1));

        //we know that the NoFall hack keeps the players Velocity set to 0 at all times we can check for this while the player has air blocks around them.
        // we check to make sure that all air blocks are present, this current code prevents false checks if the player is at the edge of a block.
        // Far corners are still an issue im working on that. This will cause false flags as the player is standing within air even though theya re on a block.
        if (
            CenBlockX.typeId == "minecraft:air" &&
            PosBlockX.typeId == "minecraft:air" &&
            NegBlockX.typeId == "minecraft:air" &&
            CenBlockZ.typeId == "minecraft:air" &&
            PosBlockZ.typeId == "minecraft:air" &&
            NegBlockZ.typeId == "minecraft:air" &&
            vy == 0
        ) {
            //flag it as a hack and not a movement hack due to issues with flya.
            flag(player, "AntiFall", "A", "Hack", null, null, null, null, false, null);
        }
    }
}
export const AntiFallA = system.runSchedule(() => {
    antifalla(AntiFallA);
}, 10);
