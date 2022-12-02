import { world, MinecraftEffectTypes, EntityQueryOptions } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, sendMsg } from "../../../util.js";

const World = world;

function vanish() {
    // Filter for only players who are vanished
    let filter = new Object() as EntityQueryOptions;
    filter.tags = ["vanish"];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        // Grant them invisibility and night vision
        // 1728000 = 24 hours
        if (hash !== undefined && encode === hash) {
            player.addEffect(MinecraftEffectTypes.invisibility, 1728000, 255, false);
            player.addEffect(MinecraftEffectTypes.nightVision, 1728000, 255, false);
            player.runCommandAsync(`title @s actionbar §6YOU ARE VANISHED!`);
        }
        // Make sure they have permission to use Vanish
        if (hash === undefined || encode !== hash) {
            // They have been busted!
            player.removeTag("vanish");
            if (player.getEffect(MinecraftEffectTypes.invisibility) || player.getEffect(MinecraftEffectTypes.nightVision)) {
                player.runCommandAsync(`effect @s clear`);
            }
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} had unauthorized permissions for Vanish. Permissions removed!`);
            } catch (error) {}
        }
    }
}

const Vanish = () => {
    World.events.tick.subscribe(vanish);
};

export { Vanish };
