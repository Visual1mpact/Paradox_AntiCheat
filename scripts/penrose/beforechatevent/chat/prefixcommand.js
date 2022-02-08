import * as Minecraft from "mojang-minecraft";
import { commandHandler } from "../../../commands/handler.js";

const World = Minecraft.world;

const PrefixCommand = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        commandHandler(player, msg);
    })
}

export { PrefixCommand }