import * as Minecraft from "mojang-minecraft";
import { commandHandler } from "../../../commands/handler.js";

const World = Minecraft.world;

function prefixcommand(msg) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    World.events.beforeChat.subscribe(msg => prefixcommand(msg));
};

export { PrefixCommand };