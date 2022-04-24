import { world, MinecraftEffectTypes, EntityQueryOptions, EffectType} from "mojang-minecraft";

const World = world;

function vanish() {
    // Filter for only players who are vanished
    let filter = new EntityQueryOptions();
    filter.tags = ['vanish', 'paradoxOpped'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Grant them invisibility and night vision
        // 1728000 = 24 hours
        player.addEffect(MinecraftEffectTypes.invisibility, 1728000, 255);
        player.addEffect(MinecraftEffectTypes.nightVision, 1728000, 255);
        player.runCommand(`title @s actionbar §6YOU ARE VANISHED!`);
    }
}

const Vanish = () => {
    World.events.tick.subscribe(vanish);
};

export { Vanish };