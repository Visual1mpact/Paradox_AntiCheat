import { world, Player, EntityQueryOptions, system } from "@minecraft/server";
import { crypto, sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function noperms() {
    const filter: EntityQueryOptions = {
        tags: ["paradoxOpped"],
    };
    // We need a list of players for checking behind a bug in Minecraft
    const filteredPlayers = world.getPlayers(filter);

    // Let's check the entities for illegal permissions
    // Apparently all dimensions are checked even though we target overworld
    const filteredEntities = world.getDimension("overworld").getEntities(filter);
    for (const entity of filteredEntities) {
        // If it's a player then ignore
        if (entity instanceof Player) {
            continue;
        }
        // This covers a bug that exists in Minecraft where for a brief tick the player will not return as a player entity
        // This bug would essentially cause this script to remove permissions from staff unintentionally
        if (filteredPlayers.includes(entity as Player)) {
            // Skip to the next entity since this is a bug in Minecraft
            continue;
        }
        // Check for hash/salt and validate password
        const hash = entity.getDynamicProperty("hash");
        const salt = entity.getDynamicProperty("salt");
        const encode = crypto?.(salt, entity.id);
        entity.removeTag("paradoxOpped");
        if (encode === hash) {
            entity.removeDynamicProperty("hash");
            entity.removeDynamicProperty("salt");
            dynamicPropertyRegistry.delete(entity.id);
        }

        sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${entity.nameTag} had unauthorized permissions. Permissions removed!`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const NoPerms = system.runInterval(() => {
    noperms();
}, 20);
