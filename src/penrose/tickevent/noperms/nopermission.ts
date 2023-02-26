import { world, Player, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, sendMsg } from "../../../util.js";

const World = world;

function noperms() {
    const filter = new Object() as EntityQueryOptions;
    filter.tags = ["paradoxOpped"];
    // We need a list of players for checking behind a bug in Minecraft
    const playerArray = [...World.getPlayers(filter)];
    // Let's check the entities for illegal permissions
    // Apparently all dimensions are checked even though we target overworld
    for (const entity of World.getDimension("overworld").getEntities(filter)) {
        // If it's a player then ignore
        if (entity instanceof Player) {
            continue;
        }
        // This covers a bug that exists in Minecraft where for a brief tick the player will not return as a player entity
        // This bug would essentially cause this script to remove permissions from staff unintentionally
        if (playerArray.includes(entity as Player)) {
            // Skip to the next entity since this is a bug in Minecraft
            continue;
        }
        // Check for hash/salt and validate password
        const hash = entity.getDynamicProperty("hash");
        const salt = entity.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (entity.hasTag("paradoxOpped")) {
            entity.removeTag("paradoxOpped");
        }
        if (hash !== undefined && encode === hash) {
            entity.removeDynamicProperty("hash");
            entity.removeDynamicProperty("salt");
        }
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${entity.nameTag} had unauthorized permissions. Permissions removed!`);
        } catch (error) {}
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const NoPerms = system.runSchedule(() => {
    noperms();
});
