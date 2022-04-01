import { world, Player, EntityQueryOptions } from "mojang-minecraft";

const World = world;

function noperms() {
    let filter = new EntityQueryOptions();
    filter.tags = ['paradoxOpped'];
    // Let's check the entities for illegal permissions
    // Apparently all dimensions are checked even though we target overworld
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // If it's a player then ignore
        if (entity instanceof Player) {
            continue;
        }
        entity.removeTag('paradoxOpped');
        entity.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${entity.id} had unauthorized permissions. Permissions removed!"}]}`);
    }
}

const NoPerms = () => {
    World.events.tick.subscribe(() => noperms());
};

export { NoPerms };