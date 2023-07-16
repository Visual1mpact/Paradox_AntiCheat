import { world, BlockBreakAfterEvent, system, EntityQueryOptions } from "@minecraft/server";
import { flag, startTimer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import { MinecraftEffectTypes } from "../../../node_modules/@minecraft/vanilla-data/lib/index.js";

const lastBreakTime = new Map<string, number>();
const breakCounter = new Map<string, number>();

async function nukera(object: BlockBreakAfterEvent): Promise<void> {
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    if (antiNukerABoolean === false) {
        lastBreakTime.clear();
        breakCounter.clear();
        world.afterEvents.blockBreak.unsubscribe(nukera);
        return;
    }

    const { block, player, dimension, brokenBlockPermutation } = object;
    const { x, y, z } = block.location;
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    if (uniqueId === player.name) {
        return;
    }

    const timerExpired = startTimer("nukera", player.id, Date.now());
    if (timerExpired.namespace.indexOf("nukera") !== -1 && timerExpired.expired) {
        const deletedKey = timerExpired.key;
        lastBreakTime.delete(deletedKey);
        breakCounter.delete(deletedKey);
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
    const counter = breakCounter.get(player.id) || 0;

    if (vegetation.indexOf(brokenBlockPermutation.type.id) === -1 && lastBreak && now - lastBreak < 5) {
        if (counter >= 3) {
            const blockLoc = dimension.getBlock({ x: x, y: y, z: z });
            const blockID = brokenBlockPermutation.clone();

            flag(player, "Nuker", "A", "Break", null, null, null, null, false);
            blockLoc.setPermutation(blockID);
            lastBreakTime.delete(player.id);
            breakCounter.delete(player.id);

            try {
                await player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
            } catch (error) {}

            // Apply effects or actions for three or more consecutive block breaks
            player.addEffect(MinecraftEffectTypes.Blindness, 1000000, { amplifier: 255, showParticles: true });
            player.addEffect(MinecraftEffectTypes.MiningFatigue, 1000000, { amplifier: 255, showParticles: true });
            player.addEffect(MinecraftEffectTypes.Weakness, 1000000, { amplifier: 255, showParticles: true });
            player.addEffect(MinecraftEffectTypes.Slowness, 1000000, { amplifier: 255, showParticles: true });

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
        excludeTags: ["freezeAura"],
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
        player.onScreenDisplay.setTitle("§r§4[§6Paradox§4]§f Frozen!", { subtitle: "§fContact Staff §4[§6AntiNukerA§4]§f", fadeInDuration: 0, fadeOutDuration: 0, stayDuration: 60 });
    }
}

const NukerA = () => {
    world.afterEvents.blockBreak.subscribe(nukera);
    const id = system.runInterval(() => {
        freeze(id);
    }, 20);
};

export { NukerA };
