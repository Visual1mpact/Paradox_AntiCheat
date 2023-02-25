import { Location, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";

const World = world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe((msg) => {
        // Get Dynamic Property
        let chatRanksBoolean = World.getDynamicProperty("chatranks_b");
        if (chatRanksBoolean === undefined) {
            chatRanksBoolean = config.modules.chatranks.enabled;
        }

        if (chatRanksBoolean === true) {
            let message = msg.message;
            let player = msg.sender;

            // Kill their broadcast if muted
            if (player.hasTag("isMuted")) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are currently muted.`);
                msg.cancel = true;
                return;
            }

            let tags = player.getTags();
            let rank: string;
            for (const tag of tags) {
                if (tag.startsWith("Rank:")) {
                    rank = tag.replace("Rank:", "");
                    rank = rank.replaceAll("--", "§r§4][§6");
                }
            }
            if (!rank) {
                rank = "Member";
            }
            // let nametag = `§4[§6${rank}§4]§r §7${player.name}§r`;
            // player.nameTag = nametag;
            if (!msg.cancel) {
                sendMsg("@a", `§4[§6${rank}§4] §7${player.name}: §r${message}`);
                msg.cancel = true;
            }
        } else if (!msg.cancel) {
            let message = msg.message;
            let player = msg.sender;

            sendMsg("@a", `${player.name}: ${message}`);
            msg.cancel = true;
        }
    });
};

export { ChatFilter };
