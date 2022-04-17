import { world, MinecraftEffectTypes, EntityQueryOptions} from "mojang-minecraft";
import { disabler } from "../../../util.js";

const World = world;

function vanish() {
    // Filter for only players who are vanished
    let filter = new EntityQueryOptions();
    filter.tags = ['vanish'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        let verification = player.hasTag('paradoxOpped');
        let invisibilityEffect = player.getEffect(MinecraftEffectTypes.invisibility);
        let nightVisionEffect = player.getEffect(MinecraftEffectTypes.nightVision);
        // Make sure they have permission to use Vanish
        if (verification && !nightVisionEffect || verification && !invisibilityEffect) {
            // Grant them invisibility and night vision
            player.addEffect(MinecraftEffectTypes.invisibility, 9999, 255);
            player.addEffect(MinecraftEffectTypes.nightVision, 9999, 255);
            player.runCommand(`title @s actionbar §6YOU ARE VANISHED!`);
        } else if (!verification) {
            // They have been busted!
            player.removeTag('vanish')
            if (invisibilityEffect || nightVisionEffect) {
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