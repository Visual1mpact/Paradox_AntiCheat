import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { crypto } from "../../../util";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry";
import config from "../../../data/config";

function verification(object: PlayerSpawnAfterEvent) {
    // Properties from class
    const { initialSpawn, player } = object;

    if (initialSpawn === false) {
        return;
    }

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");

    // Use either the operator's ID or the encryption password as the key
    const key = config.encryption.password ? config.encryption.password : player.id;

    // Generate the hash
    const encode = crypto?.(salt, key);
    if (encode === hash) {
        // Store as an element using player scoreboard id to uniquely identify them
        dynamicPropertyRegistry.set(player.id, player.name);
        return;
    } else {
        player.removeDynamicProperty("hash");
        player.removeDynamicProperty("salt");
        const hasTag = player.hasTag("paradoxOpped");
        if (hasTag) {
            player.removeTag("paradoxOpped");
        }
    }
}

const hashCode = () => {
    world.afterEvents.playerSpawn.subscribe(verification);
};

export { hashCode };
