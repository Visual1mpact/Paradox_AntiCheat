import { PlayerSpawnEvent, world } from "@minecraft/server";
import { ShowRules } from "../../showrules/showrules.js";
import { dynamicPropertyRegistry } from "../../../penrose/worldinitializeevent/registry.js";
import config from "../../../data/config.js";

async function onJoinRules(object: PlayerSpawnEvent) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false) {
        world.events.playerSpawn.unsubscribe(onJoinRules);
        return;
    }

    // Properties of class
    const { player, initialSpawn } = object;

    // Show rules if its their initial spawn in the world
    if (initialSpawn === true) {
        player.addTag("ShowRulesOnJoin");
        ShowRules();
    } else {
        return;
    }
}
const onJoinrules = () => {
    world.events.playerSpawn.subscribe(onJoinRules);
};

export { onJoinrules };
