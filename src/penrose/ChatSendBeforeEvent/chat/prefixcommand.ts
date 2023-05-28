import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { commandHandler } from "../../../commands/handler.js";

function prefixcommand(msg: ChatSendBeforeEvent) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    world.beforeEvents.chatSend.subscribe(prefixcommand);
};

export { PrefixCommand };
