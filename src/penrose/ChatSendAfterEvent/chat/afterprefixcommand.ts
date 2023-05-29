import { ChatSendAfterEvent, world } from "@minecraft/server";
import { handleCommandAfterSend } from "../../../commands/handler.js";

function afterprefixcommand(msg: ChatSendAfterEvent) {
    handleCommandAfterSend(msg);
}

const AfterPrefixCommand = () => {
    world.afterEvents.chatSend.subscribe(afterprefixcommand);
};

export { AfterPrefixCommand };
