import { world, Player, EntityQueryOptions, system } from "@minecraft/server";
import { sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
import config from "../../../data/config.js";
import { EncryptionManager } from "../../../classes/EncryptionManager.js";

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

        // Use either the operator's ID or the encryption password as the key
        const key = config.encryption.password ? config.encryption.password : entity.id;

        // Generate the hash
        const encode = EncryptionManager.hashWithSalt(salt as string, key);
        entity.removeTag("paradoxOpped");
        if (encode && encode === hash) {
            entity.removeDynamicProperty("hash");
            entity.removeDynamicProperty("salt");
            dynamicPropertyRegistry.delete(entity.id);
        }

        sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f ${entity.nameTag} had unauthorized permissions. Permissions removed!`);
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
