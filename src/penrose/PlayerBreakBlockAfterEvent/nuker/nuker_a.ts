import { world, PlayerBreakBlockAfterEvent, system, EntityQueryOptions, PlayerLeaveAfterEvent, EntityInventoryComponent, ItemEnchantsComponent } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";

const lastBreakTime = new Map<string, number>();
const breakCounter = new Map<string, number>();

function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    // Remove the player's data from the map when they log off
    const playerName = event.playerId;
    lastBreakTime.delete(playerName);
    breakCounter.delete(playerName);
}

async function nukera(object: PlayerBreakBlockAfterEvent): Promise<void> {
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    if (antiNukerABoolean === false) {
        lastBreakTime.clear();
        breakCounter.clear();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
        world.afterEvents.playerBreakBlock.unsubscribe(nukera);
        return;
    }

    const { block, player, dimension, brokenBlockPermutation } = object;
    const { x, y, z } = block.location;
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    if (uniqueId === player.name) {
        return;
    }

    // Ignore vegetation
    const vegetation = [
        /**
         * Leaves
         *
         * Oak, Spruce, Birch, Jungle, Acacia, Dark Oak,
         * Azalea, Flowering Azalea, Mangrove, Cherry.
         */
        "minecraft:leaves",
        "minecraft:leaves2",
        "minecraft:azalea_leaves",
        "minecraft:azalea_leaves_flowered",
        "minecraft:cherry_leaves",
        "minecraft:mangrove_leaves",

        /**
         * Saplings
         *
         * Oak, Sapling, Birch, Jungle, Acacia, Dark Oak,
         * Azalea, Flowering Azalea, Mangove Propagule, Cherry,
         * Bamboo.
         */
        "minecraft:bamboo_sapling",
        "minecraft:sapling",
        "minecraft:cherry_sapling",

        /**
         * Flowers
         *
         * Allium, Azure Bluet, Blue Orchid, Cornflower, Dandelion,
         * Lilac, Lily of the Valley, Orange Tulip, Oxeye Daisy,
         * Peony, Pink Tulip, Poppy, Red Tulip, Rose Bush, Sunflower,
         * White Tulip, Wither Rose, Chorus.
         */
        "minecraft:yellow_flower",
        "minecraft:red_flower",
        "minecraft:chorus_flower",
        "minecraft:flowering_azalea",
        "minecraft:azalea_leaves_flowered",
        "minecraft:wither_rose",

        /**
         * Mushrooms
         *
         * Brown Mushroom, Brown Mushroom Block, Mushroom Stem,
         * Red Mushroom, Red Mushroom Block.
         */
        "minecraft:brown_mushroom",
        "minecraft:red_mushroom",
        "minecraft:brown_mushroom_block",
        "minecraft:red_mushroom_block",

        /**
         * Crops
         *
         * Bamboo, Cactus, Carved Pumpkin, Hay Bale,
         * Melon, Pumpkin, Sugar Cane, Potatoes, Carrots
         * Beetroot, Wheat.
         */
        "minecraft:melon_block",
        "minecraft:melon_stem",
        "minecraft:potatoes",
        "minecraft:pumpkin",
        "minecraft:carved_pumpkin",
        "minecraft:pumpkin_stem",
        "minecraft:beetroot",
        "minecraft:bamboo",
        "minecraft:wheat",
        "minecraft:carrots",
        "minecraft:reeds",

        /**
         * Cave Plants
         *
         * Big Dripleaf, Glow Lichen, Hanging Roots,
         * Moss Block, Moss Carpet, Small Dripleaf,
         * Spore Blossom, Cave Vines.
         */
        "minecraft:glow_lichen",
        "minecraft:small_dripleaf_block",
        "minecraft:big_dripleaf",
        "minecraft:cave_vines",
        "minecraft:cave_vines_body_with_berries",
        "minecraft:cave_vines_head_with_berries",
        "minecraft:moss_block",
        "minecraft:moss_carpet",
        "minecraft:hanging_roots",
        "minecraft:spore_blossom",
        "minecraft:glow_berries",

        /**
         * Shrubbery
         *
         * Dead Bush, Fern, Grass, Large Fern,
         * Lily Pad, Tall Grass, Vines
         */
        "minecraft:double_plant",
        "minecraft:tallgrass",
        "minecraft:deadbush",
        "minecraft:vine",
        "minecraft:twisting_vines",
        "minecraft:weeping_vines",
        "minecraft:chorus_plant",

        /**
         * Nether
         *
         * Crimson Fungus, Warped Fungus, Nether Wart,
         * Nether Sprouts, Crimson Roots, Warped Roots.
         */
        "minecraft:crimson_fungus",
        "minecraft:warped_fungus",
        "minecraft:nether_wart",
        "minecraft:nether_sprouts",
        "minecraft:crimson_roots",
        "minecraft:warped_roots",

        /**
         * Water Plants
         *
         * Water Lily, Sea Grass, Kelp
         */
        "minecraft:waterlily",
        "minecraft:seagrass",
        "minecraft:kelp",

        /**
         * Miscellaneous
         *
         * Blocks that I am too lazy to sort out right now
         */
        "minecraft:cocoa",
        "minecraft:cactus",
        "minecraft:azalea",
        "minecraft:sweet_berry_bush",
        "minecraft:sweet_berries",
        "minecraft:snow_layer",
    ];

    const efficiencyLevels: Record<number, number> = {
        0: 0.625, // No enchantment
        1: 0.5, // Efficiency I
        2: 0.375, // Efficiency II
        3: 0.25, // Efficiency III
        4: 0.125, // Efficiency IV
        5: 0.0625, // Efficiency V
    };

    const now = Date.now();
    const lastBreak = lastBreakTime.get(player.id);
    const counter = breakCounter.get(player.id) || 0;

    const hand = player.selectedSlot;
    const inventory = player.getComponent("inventory") as EntityInventoryComponent;
    const container = inventory.container;
    const item = container.getItem(hand);
    const itemEnchantmentComponent = item?.getComponent("enchantments") as ItemEnchantsComponent;
    const itemEfficiencyLevel = itemEnchantmentComponent?.enchantments?.getEnchantment("efficiency")?.level || 0;

    const requiredTimeDifference = efficiencyLevels[itemEfficiencyLevel];
    const timeDifferenceInSeconds = (now - lastBreak) / 1000;

    if (vegetation.indexOf(brokenBlockPermutation.type.id) === -1 && lastBreak && timeDifferenceInSeconds < requiredTimeDifference) {
        if (counter >= 3) {
            const blockLoc = dimension.getBlock({ x: x, y: y, z: z });
            const blockID = brokenBlockPermutation.clone();

            flag(player, "Nuker", "A", "Break", null, null, null, null, false);
            blockLoc.setPermutation(blockID);
            lastBreakTime.delete(player.id);
            breakCounter.delete(player.id);

            player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);

            // Apply effects or actions for three or more consecutive block breaks
            const effectsToAdd = [MinecraftEffectTypes.Blindness, MinecraftEffectTypes.MiningFatigue, MinecraftEffectTypes.Weakness, MinecraftEffectTypes.Slowness];

            for (const effectType of effectsToAdd) {
                player.addEffect(effectType, 1000000, { amplifier: 255, showParticles: true });
            }

            const hasFreezeTag = player.hasTag("paradoxFreeze");
            const hasNukerFreeze = player.hasTag("freezeNukerA");
            if (!hasFreezeTag) {
                player.addTag("paradoxFreeze");
            }
            if (!hasNukerFreeze) {
                player.addTag("freezeNukerA");
            }
            return;
        } else {
            breakCounter.set(player.id, counter + 1);
        }
    } else {
        lastBreakTime.set(player.id, now);
        breakCounter.set(player.id, 1);
    }
}

function freeze(id: number) {
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    if (antiNukerABoolean === false) {
        system.clearRun(id);
        return;
    }

    const filter: EntityQueryOptions = {
        tags: ["freezeNukerA"],
        excludeTags: ["freezeAura", "freezeScaffoldA"],
    };
    const players = world.getPlayers(filter);
    for (const player of players) {
        if (!player) {
            return;
        }
        const tagBoolean = player.hasTag("paradoxFreeze");
        if (!tagBoolean) {
            player.removeTag("freezeNukerA");
            return;
        }
        player.onScreenDisplay.setTitle("§f§4[§6Paradox§4]§f Frozen!", { subtitle: "§fContact Staff §4[§6AntiNukerA§4]§f", fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 60 });
    }
}

const NukerA = () => {
    world.afterEvents.playerBreakBlock.subscribe((object) => {
        nukera(object).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    });
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
    const id = system.runInterval(() => {
        freeze(id);
    }, 20);
};

export { NukerA };
