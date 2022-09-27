import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { crypto, sendMsg } from "../../../util.js";

const World = world;

function verifypermission() {
    let filter = new Object() as EntityQueryOptions;
    filter.tags = ["paradoxOpped"];
    // Let's check the players for illegal permissions
    for (let player of World.getPlayers(filter)) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
        let encode;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // If they have the basic permission but not the hash then remove it
        player.removeTag("paradoxOpped");
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} had unauthorized permissions. Permissions removed!`);
        } catch (error) {}
    }
}

const VerifyPermission = () => {
    World.events.tick.subscribe(verifypermission);
};

export { VerifyPermission };
