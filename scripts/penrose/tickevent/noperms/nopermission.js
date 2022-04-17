import { world, Player, EntityQueryOptions } from "mojang-minecraft";

const World = world;

function noperms() {
    let filter = new EntityQueryOptions();
    filter.tags = ['paradoxOpped'];
    // We need a list of players for checking behind a bug in Minecraft
    let playerArray = [...World.getPlayers(filter)];
    // Let's check the entities for illegal permissions
    // Apparently all dimensions are checked even though we target overworld
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // If it's a player then ignore
        if (entity instanceof Player) {
            continue;
        }
        // This covers a bug that exists in Minecraft where for a brief tick the player will not return as a player entity
        // This bug would essentially cause this script to remove permissions from staff unintentionally
        if (playerArray.includes(entity.nameTag)) {
            // Skip to the next entity since this is a bug in Minecraft
            continue;
        }
        entity.removeTag('paradoxOpped');
        // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
        try {
            entity.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${entity.id} had unauthorized permissions. Permissions removed!"}]}`);
        } catch (error) {}
    }
}

const NoPerms = () => {
    World.events.tick.subscribe(() => noperms());
};

export { NoPerms };