import { EntityInventoryComponent, world, system } from "@minecraft/server";
import { flag, setScore } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

async function antiknockbacka(id: number) {
    // Get Dynamic Property
    const antikbBoolean = dynamicPropertyRegistry.get("antikb_b");

    // Unsubscribe if disabled in-game
    if (antikbBoolean === false) {
        system.clearRun(id);
        return;
    }
    // run as each player
    const players = world.getPlayers();
    for (const player of players) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const hand = player.selectedSlot;

        const invContainer = player.getComponent("inventory") as EntityInventoryComponent;
        const inventory = invContainer.container;
        const equippedItem = inventory.getItem(hand);

        let defineItem = "";
        // Check if object returns defined
        if (equippedItem !== undefined) {
            defineItem = equippedItem.typeId;
        }
        // Verify if property of object is a trident and skip if it is
        if (defineItem === "minecraft:trident") {
            continue;
        }

        const velocity = player.getVelocity();
        const velocitySum = Number((velocity.y + velocity.x + velocity.z).toFixed(3));

        // antikb/a = checks for anti knockback and flags it
        if (velocitySum <= config.modules.antikbA.magnitude) {
            if (player.hasTag("attacked") && !player.hasTag("dead") && !player.isGliding && !player.hasTag("levitating") && !player.hasTag("flying")) {
                try {
                    // Make sure Anti Knockback is turned on
                    await player.runCommandAsync(`testfor @s[scores={antikb=1..}]`);
                    flag(player, "AntiKB", "A", "Movement", null, null, "Magnitude", (player.getVelocity().y + player.getVelocity().x + player.getVelocity().z).toFixed(3), true);
                    setScore(player, "velocityvl", 1, true);
                } catch (error) {}
            }
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function AntiKnockbackA() {
    if (config.debug) {
        const antiKnockbackAId = system.runInterval(() => {
            antiknockbacka(antiKnockbackAId).catch((error) => {
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
        }, 40);
    }
}
