import { world, EntityQueryOptions, system } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../../node_modules/@minecraft/vanilla-data/lib/index";
import { sendMsg } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

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
            const effectsToAdd = [MinecraftEffectTypes.Invisibility, MinecraftEffectTypes.NightVision];

            for (const effectType of effectsToAdd) {
                player.addEffect(effectType, 1728000, { amplifier: 255, showParticles: false });
            }
            player.onScreenDisplay.setActionBar("§6YOU ARE VANISHED!");
        }
        // Make sure they have permission to use Vanish
        if (uniqueId !== player.name) {
            // They have been busted!
            player.removeTag("vanish");

            // Remove effects
            const effectsToRemove = [MinecraftEffectTypes.Invisibility, MinecraftEffectTypes.NightVision];

            for (const effectType of effectsToRemove) {
                player.removeEffect(effectType);
            }

            player.triggerEvent("unvanish");
            // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
            try {
                sendMsg("@a[tag=notify]", `§f§4[§6Paradox§4]§f §7${player.name}§f had unauthorized permissions for Vanish. Permissions removed!`);
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
    vanish().catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
});
