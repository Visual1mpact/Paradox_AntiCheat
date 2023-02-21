import { world, EntityQueryOptions, system } from "@minecraft/server";
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

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const VerifyPermission = system.runSchedule(() => {
    verifypermission();
});
