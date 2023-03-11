import { BeforeChatEvent, world } from "@minecraft/server";
import { commandHandler } from "../../../commands/handler.js";

function prefixcommand(msg: BeforeChatEvent) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    world.events.beforeChat.subscribe(prefixcommand);
};

export { PrefixCommand };
