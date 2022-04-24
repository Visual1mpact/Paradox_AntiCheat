import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function adventure() {
    // Unsubscribe if disabled in-game
    if (config.modules.adventureGM.enabled === false) {
        World.events.tick.unsubscribe(adventure);
        return;
    }
    let filter = new EntityQueryOptions();
    // 2 = adventure
    filter.excludeGameModes = [2];
    filter.excludeTags = ['paradoxOpped'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Are they not in adventure? Fix it.
        player.runCommand(`gamemode a`);
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_A)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Adventure = () => {
    World.events.tick.subscribe(() => adventure());
};

export { Adventure };