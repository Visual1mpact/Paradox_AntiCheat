import { Entity, EntitySpawnEvent, EntityItemComponent, EntityQueryOptions, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { flag } from "../../util.js";

const World = world;

function nearestPlayer(entity: Entity) {
    if (!entity) {
        return undefined;
    }

    const allPlayers = World.getPlayers();

    // Query new EntityQueryOptions class for searching
    const query = new Object() as EntityQueryOptions;
    // Set query to find the closest player, and only one of them
    query.closest = 1;
    // Closest player
    let foundPlayer: Player;
    // Iterate over all players
    for (let player of allPlayers) {
        // Find from the current player's location, now using vector 3 so check xyz coords
        query.location.x = player.location.x;
        query.location.y = player.location.y;
        query.location.z = player.location.z;
        // Exclude the current player
        query.excludeNames = [player.nameTag];
        // Find players that match query, spread them into an array, and index for the first player found
        const nearestPlayer = [...player.dimension.getPlayers(query)][0];
        // Skip if there is no nearest player
        if (!nearestPlayer) {
            continue;
        }

        foundPlayer = nearestPlayer;
    }
    return foundPlayer;
}

function crasherb(object: EntitySpawnEvent) {
    // Get Dynamic Property
    let crasherBBoolean = World.getDynamicProperty("crasherb_b");
    if (crasherBBoolean === undefined) {
        crasherBBoolean = config.modules.crasherB.enabled;
    }
    // Unsubscribe if disabled in-game
    if (crasherBBoolean === false) {
        World.events.entitySpawn.unsubscribe(crasherb);
        return;
    }

    // Event property
    let { entity } = object;

    if (entity.id === "minecraft:item") {
        let itemComponent = entity.getComponent("item") as unknown as EntityItemComponent;
        let itemObject = itemComponent.itemStack;
        if (itemObject.typeId === "minecraft:arrow" && itemObject.data > 43) {
            flag(nearestPlayer(entity), "Crasher", "B", "Exploit", null, null, "item", `${itemObject.typeId.replace("minecraft:", "")}: data=${itemObject.data}`, false, null);
            entity.kill();
        }
    }
}

const CrasherB = () => {
    World.events.entitySpawn.subscribe(crasherb);
};

export { CrasherB };
