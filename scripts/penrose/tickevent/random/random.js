import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto, generateUUID } from "../../../util.js";

const World = world;

function random() {
    let filter = new EntityQueryOptions();
    filter.tags = ['Hash:' + crypto];

    // Get players
    for (let player of World.getPlayers(filter)) {
        // Random
        if (player.hasTag('Hash:' + crypto)) {
            player.removeTag('Hash:' + crypto);
            config.modules.encryption.optag = generateUUID();
            config.modules.encryption.salt = generateUUID();
            player.addTag('Hash:' + crypto);
        }
    }
}

const Random = () => {
    World.events.tick.subscribe(() => random());
};

export { Random };