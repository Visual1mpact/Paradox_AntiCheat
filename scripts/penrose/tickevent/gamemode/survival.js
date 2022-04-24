import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function survival() {
    // Unsubscribe if disabled in-game
    if (config.modules.survivalGM.enabled === false) {
        World.events.tick.unsubscribe(survival);
        return;
    }
    let filter = new EntityQueryOptions();
    // 0 = survival
    filter.excludeGameModes = [0];
    filter.excludeTags = ['paradoxOpped'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Are they not in survival? Fix it.
        player.runCommand(`gamemode s`);
        player.runCommand(`scoreboard players add @s gamemodevl 1`);
        // Use try/catch since it could report no target selector if no player is found with tag for notify
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_S)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}`);
        } catch (error) {}
    }
}

const Survival = () => {
    World.events.tick.subscribe(() => survival());
};

export { Survival };