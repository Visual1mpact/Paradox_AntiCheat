import { world, EntityQueryOptions } from "mojang-minecraft";
import { banMessage, sendMsg, sendMsgToPlayer } from "../../../util.js";
import { setTickInterval } from "../../../misc/scheduling.js";
import { queueUnban } from "../../../commands/moderation/unban.js";

const World = world;

function serverban() {
    let filter = new EntityQueryOptions();
    filter.tags = ['isBanned'];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        if (queueUnban.has(player.nameTag)) {
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
            queueUnban.delete(player.nameTag);

            // Let staff and player know they are unbanned
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have been unbanned.`)
            sendMsg(`@a[tag=paradoxOpped]`, `§r§4[§6Paradox§4]§r ${player.nameTag} has been unbanned.`)
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