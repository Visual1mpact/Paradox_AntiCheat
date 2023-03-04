import { world, EntityQueryOptions, Location, BlockLocation, Block, GameMode, system } from "@minecraft/server";
import { getScore, flag, crypto, setScore } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

const playersOldCoordinates = new Map();

function flya(id: number) {
    // Get Dynamic Property
    const flyABoolean = dynamicPropertyRegistry.get("flya_b");

    // Unsubscribe if disabled in-game
    if (flyABoolean === false) {
        system.clearRunSchedule(id);
        return;
    }

    // Exclude creative gamemode
    const gm = new Object() as EntityQueryOptions;
    gm.excludeGameModes = [GameMode.creative];
    // run as each player who are in survival
    for (const player of World.getPlayers(gm)) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }

        const test = getScore("fly_timer", player);

        // Fun trick here so that we don't false flag /ability @s mayfly true users
        // It works because hacks add y vel to the player to stay in the air, and it stays between 1-3 whereas mayfly will have a steady score of 0
        // Will still false flag sometimes, but that's why we have !fly
        const xyVelocity = Math.hypot(player.velocity.x, player.velocity.y).toFixed(4);
        const zyVelocity = Math.hypot(player.velocity.z, player.velocity.y).toFixed(4);

        // let Block: Block, Block1: Block, Block2: Block;
        let CenBlockX: Block, CenBlockXTopLeft: Block, CenBlockXTopRight: Block, CenBlockXBottomLeft: Block, CenBlockXBottomRight: Block, NegBlockX: Block, PosBlockX: Block, CenBlockZ: Block, NegBlockZ: Block, PosBlockZ: Block;
        try {
            // We want to know if the blocks below the player is air or not

            //Block = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y, player.location.z));
            //Block1 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 1, player.location.z));
            //Block2 = player.dimension.getBlock(new BlockLocation(player.location.x, player.location.y - 2, player.location.z));
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
        } catch (error) {}

        let oldX: number, oldY: number, oldZ: number;
        if (player.hasTag("ground")) {
            const playerX = Math.trunc(player.location.x);
            const playerY = Math.trunc(player.location.y);
            const playerZ = Math.trunc(player.location.z);
            playersOldCoordinates.set(player.name, { x: playerX, y: playerY, z: playerZ });
        }
        const playerCoords = playersOldCoordinates.get(player.name);
        try {
            // Use try/catch because this will return undefined when player is loading in
            (oldX = playerCoords.x), (oldY = playerCoords.y), (oldZ = playerCoords.z);
        } catch (error) {}

        if (Number(xyVelocity) != 0.0784 || Number(zyVelocity) != 0.0784) {
            if (
                !player.hasTag("ground") &&
                !player.hasTag("gliding") &&
                !player.hasTag("levitating") &&
                !player.hasTag("riding") &&
                !player.hasTag("flying") &&
                !player.hasTag("swimming") &&
                CenBlockX.typeId == "minecraft:air" &&
                PosBlockX.typeId == "minecraft:air" &&
                NegBlockX.typeId == "minecraft:air" &&
                CenBlockZ.typeId == "minecraft:air" &&
                PosBlockZ.typeId == "minecraft:air" &&
                NegBlockZ.typeId == "minecraft:air" &&
                CenBlockXTopLeft.typeId == "minecraft:air" &&
                CenBlockXTopRight.typeId == "minecraft:air" &&
                CenBlockXBottomLeft.typeId == "minecraft:air" &&
                CenBlockXBottomRight.typeId == "minecraft:air"
                //(Block?.typeId === "minecraft:air" ?? true) &&
                //(Block1?.typeId === "minecraft:air" ?? true) &&
                //(Block2?.typeId === "minecraft:air" ?? true)
            ) {
                try {
                    setScore(player, "fly_timer", 1, true);
                } catch (error) {}
                if (test >= 6) {
                    try {
                        // Use try/catch since variables for cords could return undefined if player is loading in
                        // and they meet the conditions. An example is them flagging this, logging off, then logging
                        // back on again.
                        player.teleport(new Location(oldX, oldY, oldZ), player.dimension, 0, 0);
                    } catch (error) {}
                    flag(player, "Fly", "A", "Exploit", null, null, null, null, false, null);
                }
            } else if (player.hasTag("ground")) {
                try {
                    setScore(player, "fly_timer", 0);
                } catch (error) {}
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function FlyA() {
    const flyAId = system.runSchedule(() => {
        flya(flyAId);
    }, 20);
}
