import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { sendMsgToPlayer } from "../../../util.js";

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
        if (chatRanksBoolean === true) {
            let message = msg.message;
            let player = msg.sender;

            // Kill their broadcast if muted
            if (player.hasTag('isMuted')) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are currently muted.`)
                msg.cancel = true;
                return;
            }

            let tags = player.getTags();
            let rank;
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
                if (rcbrBoolean) {
                    // Use try/catch in case this is enabled and they don't use chat relay as this would error
                    try {
                        player.runCommand(`tellraw RealmBot ${JSON.stringify({rawtext:[{text:'RB_COMMAND' + '{content:\'' + '§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message + '\'}'}]})}`);
                    } catch (error) {
                        player.runCommand(`tellraw @a ${JSON.stringify( { rawtext: [ { text: '§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message } ] } )}`);
                        msg.cancel = true;
                    }
                } else {
                    player.runCommand(`tellraw @a ${JSON.stringify( { rawtext: [ { text: '§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message } ] } )}`);
                    msg.cancel = true;
                }
            }
        } else if (!msg.cancel) {
            let message = msg.message;
            let player = msg.sender;

            if (rcbrBoolean) {
                // Use try/catch in case this is enabled and they don't use chat relay as this would error
                try {
                    player.runCommand(`tellraw RealmBot ${JSON.stringify({rawtext:[{text:'RB_COMMAND' + '{content:\'' + player.name + ': ' + message + '\'}'}]})}`);
                } catch (error) {
                    player.runCommand(`tellraw @a ${JSON.stringify( { rawtext: [ { text: player.name + ': ' + message } ] } )}`);
                    msg.cancel = true;
                }
            } else {
                player.runCommand(`tellraw @a ${JSON.stringify( { rawtext: [ { text: player.name + ': ' + message } ] } )}`);
                msg.cancel = true;
            }
        }
    });
};

export { ChatFilter };
