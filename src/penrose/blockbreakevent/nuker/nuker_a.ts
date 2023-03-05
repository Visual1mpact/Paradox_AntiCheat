import { world, BlockLocation, BlockBreakEvent, EntityInventoryComponent, ItemEnchantsComponent, ItemStack, MinecraftEnchantmentTypes, Enchantment } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, flag } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

let blockTimer = new Map();

async function nukera(object: BlockBreakEvent) {
    // Get Dynamic Property
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");

    if (antiNukerABoolean === false) {
        World.events.blockBreak.unsubscribe(nukera);
        return;
    }

    // Properties from class
    const { block, player, dimension, brokenBlockPermutation } = object;
    // Block coordinates
    const { x, y, z } = block.location;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Get the slot number in their possession
    const hand = player.selectedSlot;

    // Get the type of item from the slot number in their possession
    const invContainer = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
    const item = invContainer.container.getItem(hand) as ItemStack;

    // We get enchantment on this item
    let enchantment: Enchantment;
    if (item) {
        const enchantComponent = item.getComponent("minecraft:enchantments") as ItemEnchantsComponent;
        const item_enchants = enchantComponent.enchantments;
        if (item_enchants.hasEnchantment(MinecraftEnchantmentTypes.efficiency)) {
            enchantment = item_enchants.getEnchantment(MinecraftEnchantmentTypes.efficiency);
        }
    }

    let timer: Date[];
    if (blockTimer.has(player.nameTag)) {
        timer = blockTimer.get(player.nameTag);
    } else {
        timer = [];
    }

    timer.push(new Date());

    const tiktok = timer.filter((time) => time.getTime() > new Date().getTime() - 100);
    blockTimer.set(player.nameTag, tiktok);

    // Get the properties of the blocks being destroyed
    const blockID = brokenBlockPermutation.clone();

    // Block dimension and location for permutation
    const blockLoc = dimension.getBlock(new BlockLocation(x, y, z));

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

    if (enchantment && enchantment.level >= MinecraftEnchantmentTypes.efficiency.maxLevel && tiktok.length < config.modules.antinukerA.max + 2) {
        return undefined;
    }

    // Flag and salvage broken blocks to their original forms
    if (tiktok.length >= config.modules.antinukerA.max && vegetation.indexOf(brokenBlockPermutation.type.id) === -1) {
        flag(player, "Nuker", "A", "Break", null, null, null, null, false, null);
        blockLoc.setPermutation(blockID);
        try {
            // Remove dropped items after nuking because it will leave a mess of entities in the world
            await player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
        } catch (error) {}

        /*
        try {
            await player.runCommandAsync(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Nuke"`);
            await player.runCommandAsync(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            kickablePlayers.add(player); player.triggerEvent('paradox:kick');
        } */
    }
}

const NukerA = () => {
    World.events.blockBreak.subscribe(nukera);
};

export { NukerA };
