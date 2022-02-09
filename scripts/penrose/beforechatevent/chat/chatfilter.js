import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // add's user custom tags to their messages if it exists or we fall back
        // also filter for non ASCII characters and remove them in messages
        if (player.name && player.name !== player.nameTag && !msg.cancel) {
            player.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"${player.nameTag} ${msg.message.replace(/[^\x00-\xFF]/g, "")}"}]}`);
            msg.cancel = true;
        } else if (player.name && player.name === player.nameTag && !msg.cancel) {
            player.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"<${player.nameTag}> ${msg.message.replace(/[^\x00-\xFF]/g, "")}"}]}`);
            msg.cancel = true;
        }
    })
}

export { ChatFilter }