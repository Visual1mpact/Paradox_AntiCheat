import { world, MinecraftEffectTypes, EntityQueryOptions } from "mojang-minecraft";
import { disabler } from "../../../util.js";

const World = world;

function vanish() {
    // Filter for only players who are vanished
    let filter = new EntityQueryOptions();
    filter.tags = ['vanish'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Grant them invisibility and night vision
        // 1728000 = 24 hours
        if (player.hasTag('paradoxOpped')) {
            player.addEffect(MinecraftEffectTypes.invisibility, 1728000, 255, false);
            player.addEffect(MinecraftEffectTypes.nightVision, 1728000, 255, false);
            if (!player.hasTag('performance')) {
                player.runCommand(`title @s actionbar §6YOU ARE VANISHED!`);
            }
        }
        // Make sure they have permission to use Vanish
        if (!player.hasTag('paradoxOpped')) {
            // They have been busted!
            player.removeTag('vanish')
            if (player.getEffect(MinecraftEffectTypes.invisibility) || player.getEffect(MinecraftEffectTypes.nightVision)) {
                player.runCommand(`effect "${disabler(player.nameTag)}" clear`);
            }
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} had unauthorized permissions for Vanish. Permission removed!"}]}`);
            } catch (error) {}
        }
    }
}

const Vanish = () => {
    World.events.tick.subscribe(vanish);
};

export { Vanish };