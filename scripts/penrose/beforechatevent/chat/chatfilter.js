import * as Minecraft from "mojang-minecraft";
import { disabler } from "../../../util.js";

const World = Minecraft.world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe(msg => {

        let message = msg.message
        let player = msg.sender

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
        if (!msg.cancel) {
            player.runCommand(`tellraw @a {"rawtext":[{"text":"§4[§6${rank}§4]§r §7${disabler(player.nameTag)}:§r ${message.replace(/[^\x00-\xFF]/g, "")}"}]}`);
            msg.cancel = true;
        }
    });
};

export { ChatFilter };