import { world, EntityQueryOptions } from "mojang-minecraft";
import { crypto, disabler } from "../../../util.js";

const World = world;

function verifypermission() {
    let filter = new EntityQueryOptions();
    filter.tags = ['paradoxOpped'];
    filter.excludeTags = ['Hash:' + crypto];
    // Let's check the players for illegal permissions
    for (let player of World.getPlayers(filter)) {
        // If they have the basic permission but not the hash then remove it
        if (!player.hasTag('Hash:' + crypto)) {
            player.removeTag('paradoxOpped');
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} had unauthorized permissions. Permissions removed!"}]}`);
            } catch (error) {}
        }
    }
}

const VerifyPermission = () => {
    World.events.tick.subscribe(() => verifypermission());
};

export { VerifyPermission };