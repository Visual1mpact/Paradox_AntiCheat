import { Location, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { sendMsg, sendMsgToPlayer } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe((msg) => {
        // Get Dynamic Property
        const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");

        if (chatRanksBoolean === true) {
            const message = msg.message;
            const player = msg.sender;

            // Kill their broadcast if muted
            if (player.hasTag("isMuted")) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are currently muted.`);
                msg.cancel = true;
                return;
            }

            const tags = player.getTags();
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
            const message = msg.message;
            const player = msg.sender;

            sendMsg("@a", `${player.name}: ${message}`);
            msg.cancel = true;
        }
    });
};

export { ChatFilter };
