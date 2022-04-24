import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function creative() {
    // Unsubscribe if disabled in-game
    if (config.modules.creativeGM.enabled === false) {
        World.events.tick.unsubscribe(creative);
        return;
    }
    let filter = new EntityQueryOptions();
    // 1 = creative
    filter.excludeGameModes = [1];
    filter.excludeTags = ['paradoxOpped'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Are they not in creative? Fix it.
        player.runCommand(`gamemode c`);
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_C)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Creative = () => {
    World.events.tick.subscribe(() => creative());
};

export { Creative };