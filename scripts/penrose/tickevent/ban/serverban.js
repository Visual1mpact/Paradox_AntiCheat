import { world, EntityQueryOptions } from "mojang-minecraft";
import { banMessage, crypto, disabler } from "../../../util.js";
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
            // Remove tag
            player.removeTag('isBanned');

            let tags = player.getTags();

            // This removes old ban stuff
            tags.forEach(t => {
                if(t.startsWith("Reason:")) {
                    player.removeTag(t);
                }
                if(t.startsWith("By:")) {
                    player.removeTag(t);
                }
            });

            // Remove player from queue
            queueUnban.delete(disabler(player.nameTag));

            // Let staff and player know they are unbanned
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been unbanned."}]}`);
            player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has been unbanned."}]}`);
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