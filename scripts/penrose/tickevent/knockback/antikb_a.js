import { EntityQueryOptions, world } from "mojang-minecraft";
import { flag, disabler } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function antiknockbacka() {
    // Unsubscribe if disabled in-game
    if (config.modules.antikbA.enabled === false) {
        World.events.tick.unsubscribe(antiknockbacka);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['paradoxOpped'];
    // run as each player
    for (let player of World.getPlayers(filter)) {

        // antikb/a = checks for anti knockback and flags it
        if((player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3) <= config.modules.antikbA.magnitude) {
            if(player.hasTag('attacked') && !player.hasTag('dead') && !player.hasTag('gliding') && !player.hasTag('levitating') && !player.hasTag('flying')) {
                try {
                    // Make sure Anti Knockback is turned on
                    player.runCommand(`testfor @a[name=${disabler(player.nameTag)},scores={antikb=1..}]`);
                    flag(player, "AntiKB", "A", "Movement", false ,false, "Magnitude", (player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3), true, false);
                    player.runCommand(`scoreboard players add @a[name=${disabler(player.nameTag)}] velocityvl 1`);
                } catch(error) {}
            }
        }
    }
    return;
}

const AntiKnockbackA = () => {
    // Executes every 2 seconds
    setTickInterval(() => antiknockbacka(), 40);
};

export { AntiKnockbackA };