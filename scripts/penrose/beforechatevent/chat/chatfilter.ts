import { Location, world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";

const World = world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe(msg => {
        // Get Dynamic Property
        let rcbrBoolean = World.getDynamicProperty('rcbr_b');
        if (rcbrBoolean === undefined) {
            rcbrBoolean = config.modules.rbcr.enabled;
        }
        let chatRanksBoolean = World.getDynamicProperty('chatranks_b');
        if (chatRanksBoolean === undefined) {
            chatRanksBoolean = config.modules.chatranks.enabled;
        }

        // Check if there is a tpr response
        if (msg.sender.hasTag('tpr') && msg.message.toLowerCase().includes('yes')) {
            msg.cancel = true;
            for (let player of World.getPlayers()) {
                if (player.hasTag('tpr:' + msg.sender.name)) {
                    /**
                     * Authorization has been approved so let's teleport the requester to the requestee
                     */
                    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Hello ${player.name}! ${msg.sender.name} has approved your request to teleport to their location!`);
                    sendMsgToPlayer(msg.sender, `§r§4[§6Paradox§4]§r You have approved a teleport request from ${player.name}!`);
                    player.teleport(msg.sender.location, msg.sender.dimension, 0, 0);
                    player.removeTag('tpr:' + msg.sender.name);
                    msg.sender.removeTag('tpr');
                    break;
                }
            }
        } else if (msg.sender.hasTag('tpr') && msg.message.toLowerCase().includes('no')) {
            msg.cancel = true;
            for (let player of World.getPlayers()) {
                if (player.hasTag('tpr:' + msg.sender.name)) {
                    /**
                     * Authorization has been denied so notify them
                     */
                    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Hello ${player.name}! ${msg.sender.name} has denied your request to teleport to their location!`);
                    sendMsgToPlayer(msg.sender, `§r§4[§6Paradox§4]§r You have denied a teleport request from ${player.name}!`);
                    player.removeTag('tpr:' + msg.sender.name);
                    msg.sender.removeTag('tpr');
                    break;
                }
            }
        }

        if (chatRanksBoolean === true) {
            let message = msg.message;
            let player = msg.sender;

            // Kill their broadcast if muted
            if (player.hasTag('isMuted')) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are currently muted.`);
                msg.cancel = true;
                return;
            }

            let tags = player.getTags();
            let rank: string;
            for (const tag of tags) {
                if (tag.startsWith('Rank:')) {
                    rank = tag.replace('Rank:', '');
                    rank = rank.replaceAll('--', '§4]§r§4[§6');
                }
            }
            if (!rank) {
                rank = "Member";
            }
            // let nametag = `§4[§6${rank}§4]§r §7${player.name}§r`;
            // player.nameTag = nametag;
            if (!msg.cancel) {
                if (rcbrBoolean) sendMsg('RealmBot', 'RB_COMMAND' + `{content:'[§6${rank}§4]§r §7${player.name}: ${message}'}`)
                sendMsg('@a', `§4[§6${rank}§4]§r §7${player.name}: ${message}`)
                msg.cancel = true;
            }
        } else if (!msg.cancel) {
            let message = msg.message;
            let player = msg.sender;

            if (rcbrBoolean) sendMsg('RealmBot', 'RB_COMMAND' + `{content:'${player.name}: ${message}'}`)
            sendMsg('@a', `${player.name}: ${message}`)
            msg.cancel = true;
        }
    });
};

export { ChatFilter };
