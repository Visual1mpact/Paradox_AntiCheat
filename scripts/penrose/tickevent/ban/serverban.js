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