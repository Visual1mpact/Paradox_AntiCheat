import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";
function biomeHelp(player: Player, prefix: string) {
    let commandStatus;
    if (!config.customcommands.biome) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: biome`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: biome [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Sends the current biome and direction the player is facing. §6Note you need to enable Molang. `,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}biome`,
        `        §4- §6Send the current biome and direction to the player§f`,
        `    ${prefix}biome help`,
        `        §4- §6Show command help§f`,
    ]);
}
/**
 * @name biome
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function biome(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/biome.js:26)");
    }
    const player = message.sender;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }
    // Check for custom prefix
    const prefix = getPrefix(player);
    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.biome) {
        return biomeHelp(player, prefix);
    }
    const directionMap: Map<string, string> = new Map([
        ["North", "Facing: North"],
        ["South", "Facing: South"],
        ["East", "Facing: East"],
        ["West", "Facing: West"],
    ]);
    const defaultDirection: string = "Facing: Unknown!";
    let direction: string;
    // Iterate over the map entries to find a matching tag
    for (const [tag, mappedDirection] of directionMap.entries()) {
        if (player.hasTag(tag)) {
            direction = mappedDirection;
            break;
        }
    }
    // If no matching tag is found, assign the default direction
    if (!direction) {
        direction = defaultDirection;
    }
    //Biome Map
    const biomeMap: Map<string, string> = new Map([
        ["basalt_deltas", "Biome: Basalt Deltas"],
        ["bamboo_jungle", "Biome: Bamboo Jungle"],
        ["bamboo_jungle_hills", "Biome: Bamboo Jungle Hills"],
        ["beach", "Biome: Beach"],
        ["birch_forest", "Biome: Birch Forest"],
        ["birch_forest_hills", "Biome: Birch Forest Hills"],
        ["birch_forest_hills_mutated", "Biome: Birch Forest Hills Mutated"],
        ["birch_forest_mutated", "Biome: Birch Forest Mutated"],
        ["cold_beach", "Biome: Cold Beach"],
        ["cold_ocean", "Biome: Cold Ocean"],
        ["cold_taiga", "Biome: Cold Taiga"],
        ["cold_taiga_hills", "Biome: Cold Taiga Hills"],
        ["cold_taiga_mutated", "Biome: Cold Taiga Mutated"],
        ["crimson_forest", "Biome: Crimson Forest"],
        ["deep_cold_ocean", "Biome: Deep Cold Ocean"],
        ["deep_frozen_ocean", "Biome: Deep Frozen Ocean"],
        ["deep_lukewarm_ocean", "Biome: Deep Lukewarm Ocean"],
        ["deep_ocean", "Biome: Deep Ocean"],
        ["deep_warm_ocean", "Biome: Deep Warm Ocean"],
        ["desert", "Biome: Desert"],
        ["desert_hills", "Biome: Desert Hills"],
        ["desert_mutated", "Biome: Desert Mutated"],
        ["extreme_hills", "Biome: Extreme Hills"],
        ["extreme_hills_edge", "Biome: Extreme Hills Edge"],
        ["extreme_hills_mutated", "Biome: Extreme Hills Mutated"],
        ["extreme_hills_plus_trees", "Biome: Extreme Hills Plus Trees"],
        ["extreme_hills_plus_trees_mutated", "Biome: Extreme Hills Plus Trees Mutated"],
        ["flower_forest", "Biome: Flower Forest"],
        ["forest", "Biome: Forest"],
        ["forest_hills", "Biome: Forest Hills"],
        ["frozen_ocean", "Biome: Frozen Ocean"],
        ["frozen_river", "Biome: Frozen River"],
        ["ice_mountains", "Biome: Ice Mountains"],
        ["ice_plains", "Biome: Ice plains"],
        ["ice_plains_spikes", "Biome: Ice plains Spikes"],
        ["jungle", "Biome: Jungle"],
        ["jungle_edge", "Biome: Jungle Edge"],
        ["jungle_edge_mutated", "Biome: Jungle Edge Mutated"],
        ["jungle_hills", "Biome: Jungle Hills"],
        ["jungle_mutated", "Biome: Jungle Mutated"],
        ["legacy_frozen_ocean", "Biome: Legacy Frozen Ocean"],
        ["lofty_peaks", "Biome: Lofty Peaks"],
        ["lukewarm_ocean", "Biome: Lukewarm Ocean"],
        ["mega_spruce_taiga", "Biome: Mega Spruce Taiga"],
        ["mega_spruce_taiga_hills", "Biome: Mega Spruce Taiga Hills"],
        ["mega_taiga", "Biome: Mega Taiga"],
        ["mega_taiga_hills", "Biome: Mega Taiga Hills"],
        ["mesa", "Biome: Mesa"],
        ["mesa_bryce", "Biome: Mesa Bryce"],
        ["mesa_plateau", "Biome: Mesa Plateau"],
        ["mesa_plateau_mutated", "Biome: Mesa Plateau Mutated"],
        ["mesa_plateau_stone", "Biome: Mesa Plateau Stone"],
        ["mesa_plateau_stone_mutated", "Biome: Mesa Plateau Stone Mutated"],
        ["mountain_grove", "Biome: Mountain Grove"],
        ["mountain_meadow", "Biome: Mountain Meadow"],
        ["mountain_peaks", "Biome: Mountain peaks"],
        ["mushroom_island", "Biome: Mushroom Island"],
        ["mushroom_island_shore", "Biome: Mushroom Island Shore"],
        ["nether_wastes", "Biome: Nether Wastes"],
        ["ocean", "Biome: Ocean"],
        ["plains", "Biome: Plains"],
        ["river", "Biome: River"],
        ["roofed_forest_mutated", "Biome: Roofed Forest Mutated"],
        ["savanna", "Biome: Savanna"],
        ["savanna_mutated", "Biome: Savanna Mutated"],
        ["savanna_plateau", "Biome: Savanna Plateau"],
        ["savanna_plateau_mutated", "Biome: Savanna Plateau Mutated"],
        ["snow_capped_peaks", "Biome: Snow Capped Peaks"],
        ["snowy_slopes", "Biome: Snowy Slopes"],
        ["soulsand_valley", "Biome: Soulsand Valley"],
        ["stone_beach", "Biome: Stone Beach"],
        ["sunflower_plains", "Biome: Sunflower Plains"],
        ["swamp", "Biome: Swamp"],
        ["swamp_mutated", "Biome: Swamp Mutated"],
        ["taiga", "Biome: Taiga"],
        ["taiga_hills", "Biome: Taiga Hills"],
        ["taiga_mutated", "Biome: Taiga Mutated"],
        ["the_end", "Biome: The End"],
        ["warm_ocean", "Biome: Warm Ocean"],
        ["warped_forest", "Biome: Warped Forest"],
        ["deep_dark", "Biome: Deep Dark"],
        ["lush_caves", "Biome: Lush Caves"],
        ["jagged_peaks", "Biome: Lush Caves"],
        ["dripstone_caves", "Biome: Dripstone Cave"],
        ["meadow", "Biome: Meadow"],
        ["mangrove_swamp", "Biome: Mangrove Swamp"],
        ["cherry_grove", "Biome: Cherry Grove"],
        ["roofed_forest", "Biome: Roofed Forest"],
        ["grove", "Biome: Grove"],
        ["stony_peaks", "Biome: Stony Peaks"],
    ]);

    const defaultBiome: string = "Unknown Or §4Molang is not enabled!§f";
    let currentBiome: string;
    // Iterate over the map entries to find a matching tag
    for (const [tag, mappedBiome] of biomeMap.entries()) {
        if (player.hasTag(tag)) {
            currentBiome = mappedBiome;
            break;
        }
    }
    // If no matching tag is found, assign the default biome
    if (!currentBiome) {
        currentBiome = defaultBiome;
    }

    return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f ${currentBiome} \n§f§4[§6Paradox§4]§f ${direction}`);
}
