import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

const ChatFilter = () => {
    World.events.beforeChat.subscribe(msg => {

        const player = msg.sender;

        // Modify the message before broadcasting
        // Add custom tags to their messages if it exists or we fall back
        // Filter for non ASCII characters and remove them in messages
        if (player.name && player.name !== player.nameTag && !msg.cancel) {
            // We can't modify the name of the messenger. Might be hardcoded. So we use tellraw.
            // This will be used if player.nameTag is modified
            player.dimension.runCommand(`tellraw @a {"rawtext":[{"text":"${player.nameTag} ${msg.message.replace(/[^\x00-\xFF]/g, "")}"}]}`);
            msg.cancel = true;
        } else if (player.name && player.name === player.nameTag) {
            // We can modify the message without using tellraw
            // This will be used if player.nameTag is not modified
            msg.message = `${msg.message.replace(/[^\x00-\xFF]/g, "")}`
        }
    })
}

export { ChatFilter }