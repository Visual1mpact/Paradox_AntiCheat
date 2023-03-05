import { PlayerSpawnEvent, world } from "@minecraft/server";
import config from "../../../data/config";
import { crypto } from "../../../util";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry";

function verification(object: PlayerSpawnEvent) {
    // Properties from class
    const { initialSpawn, player } = object;

    if (initialSpawn === false) {
        return;
    }

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    if (hash !== undefined && encode === hash) {
        // Store as an element using player scoreboard id to uniquely identify them
        dynamicPropertyRegistry.set(player.scoreboard.id, player.name);
    }
}

const hashCode = () => {
    world.events.playerSpawn.subscribe(verification);
};

export { hashCode };
