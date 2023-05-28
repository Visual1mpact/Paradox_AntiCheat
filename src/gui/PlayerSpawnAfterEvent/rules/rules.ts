import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { ShowRules } from "../../showrules/showrules.js";
import { dynamicPropertyRegistry } from "../../../penrose/WorldInitializeAfterEvent/registry.js";

async function onJoinRules(object: PlayerSpawnAfterEvent) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false) {
        world.afterEvents.playerSpawn.unsubscribe(onJoinRules);
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
    world.afterEvents.playerSpawn.subscribe(onJoinRules);
};

export { onJoinrules };
