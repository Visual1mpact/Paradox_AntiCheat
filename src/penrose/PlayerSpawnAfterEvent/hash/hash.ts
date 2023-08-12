import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { crypto } from "../../../util";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry";

function verification(object: PlayerSpawnAfterEvent) {
    // Properties from class
    const { initialSpawn, player } = object;

    if (initialSpawn === false) {
        return;
    }

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    const encode = crypto?.(salt, player.id);
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
