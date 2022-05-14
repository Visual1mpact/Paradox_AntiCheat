import { world, EntityQueryOptions } from "mojang-minecraft";
import { banMessage, disabler } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";
import { queueUnban } from "../../../commands/moderation/unban.js";

const World = world;

function serverban() {
    let filter = new EntityQueryOptions();
    filter.tags = ['isBanned'];
    // If they are a tester then let them in
    filter.excludeTags = ['TestPlayer'];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        if (queueUnban.has(disabler(player.nameTag))) {
            player.removeTag('isBanned');
            queueUnban.delete(disabler(player.nameTag))
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been unbanned."}]}`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has been unbanned."}]}`);
            continue;
        }
        // Ban message
        banMessage(player);
    }
}

const ServerBan = () => {
    // Executes every 2 seconds
    setTickInterval(() => serverban(), 40);
};

export { ServerBan };