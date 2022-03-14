import { world } from "mojang-minecraft";
import { commandHandler } from "../../../commands/handler.js";

const World = world;

function prefixcommand(msg) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    World.events.beforeChat.subscribe(msg => prefixcommand(msg));
};

export { PrefixCommand };