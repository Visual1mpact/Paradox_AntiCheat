import { world, EntityQueryOptions, system } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeEvent/registry.js";

async function vanish() {
    // Filter for only players who are vanished
    const filter: EntityQueryOptions = {
        tags: ["vanish"],
    };
    const filteredPlayers = world.getPlayers(filter);
    // Run as each player
    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Make sure they have permission
        if (uniqueId === player.name) {
            player.addEffect(MinecraftEffectTypes.Invisibility, 1728000, { amplifier: 255, showParticles: false });
            player.addEffect(MinecraftEffectTypes.NightVision, 1728000, { amplifier: 255, showParticles: false });
            await player.runCommandAsync(`title @s actionbar §6YOU ARE VANISHED!`);
        }
        // Make sure they have permission to use Vanish
        if (uniqueId !== player.name) {
            // They have been busted!
            player.removeTag("vanish");
            if (player.getEffect(MinecraftEffectTypes.Invisibility) || player.getEffect(MinecraftEffectTypes.NightVision)) {
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
export const Vanish = system.runInterval(() => {
    vanish();
});
