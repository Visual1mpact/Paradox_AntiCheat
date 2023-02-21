import { EntityInventoryComponent, world, system } from "@minecraft/server";
import { flag, crypto, setScore } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function antiknockbacka(id: number) {
    // Get Dynamic Property
    let antikbBoolean = World.getDynamicProperty("antikb_b");
    if (antikbBoolean === undefined) {
        antikbBoolean = config.modules.antikbA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (antikbBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty("hash");
        let salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }

        let hand = player.selectedSlot;

        let invContainer = player.getComponent("inventory") as EntityInventoryComponent;
        let inventory = invContainer.container;
        let equippedItem = inventory.getItem(hand);

        let defineItem = "";
        // Check if object returns defined
        if (equippedItem !== undefined) {
            defineItem = equippedItem.typeId;
        }
        // Verify if property of object is a trident and skip if it is
        if (defineItem === "minecraft:trident") {
            continue;
        }

        // antikb/a = checks for anti knockback and flags it
        if (Number((player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3)) <= config.modules.antikbA.magnitude) {
            if (player.hasTag("attacked") && !player.hasTag("dead") && !player.hasTag("gliding") && !player.hasTag("levitating") && !player.hasTag("flying")) {
                try {
                    // Make sure Anti Knockback is turned on
                    player.runCommandAsync(`testfor @s[scores={antikb=1..}]`);
                    flag(player, "AntiKB", "A", "Movement", null, null, "Magnitude", (player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3), true, null);
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
export const AntiKnockbackA = system.runSchedule(() => {
    antiknockbacka(AntiKnockbackA);
}, 40);
