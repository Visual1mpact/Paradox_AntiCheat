import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { disabler } from "../../../util.js";

const World = world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe(msg => {
        if (config.modules.chatranks.enabled === true) {
            let message = msg.message;
            let player = msg.sender;

            // Kill their broadcast if muted
            if (player.hasTag('isMuted')) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been muted."}]}`);
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
                if (config.modules.rbcr.enabled) {
                    // Use try/catch in case this is enabled and they don't use chat relay as this would error
                    try {
                        player.runCommand(`tellraw RealmBot ${JSON.stringify({rawtext:[{text:'RB_COMMAND' + '{content:\'' + '§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message + '\'}'}]})}`);
                    } catch (error) {
                        player.runCommand(`tellraw @a ${JSON.stringify({rawtext:[{text:'§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message}]}).replace(/\\"/g, '"')}`);
                        msg.cancel = true;
                    }
                } else {
                    player.runCommand(`tellraw @a ${JSON.stringify({rawtext:[{text:'§4[§6' + rank + '§4]§r §7' + player.name + ':§r ' + message}]}).replace(/\\"/g, '"')}`);
                    msg.cancel = true;
                }
            }
        } else if (!msg.cancel) {
            let message = msg.message;
            let player = msg.sender;

            if (config.modules.rbcr.enabled) {
                // Use try/catch in case this is enabled and they don't use chat relay as this would error
                try {
                    player.runCommand(`tellraw RealmBot ${JSON.stringify({rawtext:[{text:'RB_COMMAND' + '{content:\'' + player.name + ': ' + message + '\'}'}]})}`);
                } catch (error) {
                    player.runCommand(`tellraw @a ${JSON.stringify({rawtext:[{text:player.name + ': ' + message}]}).replace(/\\"/g, '"')}`);
                    msg.cancel = true;
                }
            } else {
                player.runCommand(`tellraw @a ${JSON.stringify({rawtext:[{text:player.name + ': ' + message}]}).replace(/\\"/g, '"')}`);
                msg.cancel = true;
            }
        }
    });
};

export { ChatFilter };
