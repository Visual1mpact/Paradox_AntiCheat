import { EntityInventoryComponent, world } from "mojang-minecraft";
import { flag, crypto } from "../../../util.js";
import config from "../../../data/config.js";
import { clearTickInterval, setTickInterval } from "../../../misc/scheduling.js";

const World = world;

function antiknockbacka(id: number) {
    // Get Dynamic Property
    let antikbBoolean = World.getDynamicProperty("antikb_b");
    if (antikbBoolean === undefined) {
        antikbBoolean = config.modules.antikbA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (antikbBoolean === false) {
        clearTickInterval(id);
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
            defineItem = equippedItem.id;
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
                    player.runCommand(`testfor @s[scores={antikb=1..}]`);
                    flag(player, "AntiKB", "A", "Movement", null, null, "Magnitude", (player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3), true, null);
                    player.runCommand(`scoreboard players add @s velocityvl 1`);
                } catch (error) {}
            }
        }
    }
    return;
}

const AntiKnockbackA = () => {
    // Executes every 2 seconds
    const id = setTickInterval(() => antiknockbacka(id), 40);
};

export { AntiKnockbackA };
