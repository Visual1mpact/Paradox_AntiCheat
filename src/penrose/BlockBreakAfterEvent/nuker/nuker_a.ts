import { world, BlockBreakAfterEvent, Vector } from "@minecraft/server";
import { flag, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeEvent/registry.js";
import { kickablePlayers } from "../../../kickcheck.js";

const lastBreakTime = new Map<string, number>();

async function nukera(object: BlockBreakAfterEvent): Promise<void> {
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    if (antiNukerABoolean === false) {
        lastBreakTime.clear();
        world.afterEvents.blockBreak.unsubscribe(nukera);
        return;
    }

    const { block, player, dimension, brokenBlockPermutation } = object;
    const { x, y, z } = block.location;

    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    if (uniqueId === player.name) {
        return;
    }

    /**
     * startTimer will make sure the key is properly removed
     * when the time for theVoid has expired. This will preserve
     * the integrity of our Memory.
     */
    const timerExpired = startTimer("nukera", player.id, Date.now());
    if (timerExpired.namespace.indexOf("nukera") !== -1 && timerExpired.expired) {
        const deletedKey = timerExpired.key; // extract the key without the namespace prefix
        lastBreakTime.delete(deletedKey);
    }

    // Ignore vegetation
    const vegetation = [
        "minecraft:yellow_flower",
        "minecraft:red_flower",
        "minecraft:double_plant",
        "minecraft:wither_rose",
        "minecraft:tallgrass",
        "minecraft:hanging_roots",
        "minecraft:leaves",
        "minecraft:leaves2",
        "minecraft:azalea_leaves",
        "minecraft:azalea_leaves_flowered",
        "minecraft:deadbush",
        "minecraft:cocoa",
        "minecraft:chorus_plant",
        "minecraft:chorus_flower",
        "minecraft:cave_vines",
        "minecraft:cave_vines_body_with_berries",
        "minecraft:cave_vines_head_with_berries",
        "minecraft:glow_berries",
        "minecraft:carrots",
        "minecraft:cactus",
        "minecraft:big_dripleaf",
        "minecraft:beetroot",
        "minecraft:bamboo",
        "minecraft:bamboo_sapling",
        "minecraft:azalea",
        "minecraft:flowering_azalea",
        "minecraft:waterlily",
        "minecraft:melon_block",
        "minecraft:melon_stem",
        "minecraft:potatoes",
        "minecraft:pumpkin",
        "minecraft:carved_pumpkin",
        "minecraft:pumpkin_stem",
        "minecraft:sapling",
        "minecraft:seagrass",
        "minecraft:small_dripleaf_block",
        "minecraft:spore_blossom",
        "minecraft:reeds",
        "minecraft:sweet_berry_bush",
        "minecraft:sweet_berries",
        "minecraft:vine",
        "minecraft:wheat",
        "minecraft:kelp",
        "minecraft:crimson_fungus",
        "minecraft:warped_fungus",
        "minecraft:glow_lichen",
        "minecraft:brown_mushroom",
        "minecraft:red_mushroom",
        "minecraft:nether_wart",
        "minecraft:nether_sprouts",
        "minecraft:crimson_roots",
        "minecraft:warped_roots",
        "minecraft:twisting_vines",
        "minecraft:weeping_vines",
    ];

    const now = Date.now();
    const lastBreak = lastBreakTime.get(player.id);
    if (vegetation.indexOf(brokenBlockPermutation.type.id) === -1 && lastBreak && now - lastBreak < 15) {
        const blockLoc = dimension.getBlock(new Vector(x, y, z));
        const blockID = brokenBlockPermutation.clone();

        flag(player, "Nuker", "A", "Break", null, null, null, null, false, null);
        blockLoc.setPermutation(blockID);
        lastBreakTime.delete(player.id);

        try {
            await player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
        } catch (error) {}

        try {
            player.addTag("Reason:Anti-NukerA");
            player.addTag("By:Paradox");
            player.addTag("isBanned");
        } catch (error) {
            kickablePlayers.add(player);
            player.triggerEvent("paradox:kick");
        }
        return;
    } else {
        lastBreakTime.set(player.id, now);
    }
}

const NukerA = () => {
    world.afterEvents.blockBreak.subscribe(nukera);
};

export { NukerA };
