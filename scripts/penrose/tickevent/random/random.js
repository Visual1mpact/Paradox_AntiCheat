import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypt, crypto, generateUUID } from "../../../util.js";

const World = world;

function random() {
    let filter = new EntityQueryOptions();
    filter.tags = ['Hash:' + crypto];

    // Get players
    for (let player of World.getPlayers(filter)) {
        // Random
        if (player.hasTag('Hash:' + crypto)) {
            // Store old hash
            let oldCryto = 'Hash:' + crypto;
            // New salt and optag
            let newSalt = generateUUID();
            let newOptag = generateUUID();
            // Create new hash
            let newCrypto = crypt(newSalt, newOptag);
            // Add new hash
            player.addTag('Hash:' + newCrypto);
            // Set new salt and optag globally
            config.modules.encryption.salt = newSalt;
            config.modules.encryption.optag = newOptag;
            // Remove old hash
            player.removeTag(oldCryto);
        }
    }
}

const Random = () => {
    World.events.tick.subscribe(() => random());
};

export { Random };