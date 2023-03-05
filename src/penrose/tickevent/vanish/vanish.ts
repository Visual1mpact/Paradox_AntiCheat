import { world, MinecraftEffectTypes, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

async function vanish() {
    // Filter for only players who are vanished
    let filter = new Object() as EntityQueryOptions;
    filter.tags = ["vanish"];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

        // Make sure they have permission
        if (uniqueId === player.name) {
            player.addEffect(MinecraftEffectTypes.invisibility, 1728000, 255, false);
            player.addEffect(MinecraftEffectTypes.nightVision, 1728000, 255, false);
            await player.runCommandAsync(`title @s actionbar §6YOU ARE VANISHED!`);
        }
        // Make sure they have permission to use Vanish
        if (uniqueId !== player.name) {
            // They have been busted!
            player.removeTag("vanish");
            if (player.getEffect(MinecraftEffectTypes.invisibility) || player.getEffect(MinecraftEffectTypes.nightVision)) {
                await player.runCommandAsync(`effect @s clear`);
            }
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag} had unauthorized permissions for Vanish. Permissions removed!`);
            } catch (error) {}
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const Vanish = system.runSchedule(() => {
    vanish();
});
