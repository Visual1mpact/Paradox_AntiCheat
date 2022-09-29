import { BeforeChatEvent, world } from "mojang-minecraft";
import { commandHandler } from "../../../commands/handler.js";

const World = world;

function prefixcommand(msg: BeforeChatEvent) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    World.events.beforeChat.subscribe(prefixcommand);
};

export { PrefixCommand };
