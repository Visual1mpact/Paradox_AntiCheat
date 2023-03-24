import { BeforeChatEvent, commandHandler, world } from "../../../index";

function prefixcommand(msg: BeforeChatEvent) {
    const player = msg.sender;

    commandHandler(player, msg);
}

const PrefixCommand = () => {
    world.events.beforeChat.subscribe(prefixcommand);
};

export { PrefixCommand };
