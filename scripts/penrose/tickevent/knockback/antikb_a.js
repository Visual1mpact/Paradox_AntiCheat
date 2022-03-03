import * as Minecraft from "mojang-minecraft";
import { flag, disabler } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const AntiKnockbackA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {

            // antikb/a = checks for anti knockback and flags it
            if((player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3) <= config.modules.antikbA.magnitude && !player.hasTag('paradoxOpped')) {
                if(player.hasTag('attacked') && !player.hasTag('dead') && !player.hasTag('gliding') && !player.hasTag('levitating') && !player.hasTag('flying')) {
                    try {
                        // Make sure Anti Knockback is turned on
                        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",scores={antikb=1..}]`);
                        flag(player, "AntiKB", "A", "Movement", "Magnitude", (player.velocity.y + player.velocity.x + player.velocity.z).toFixed(3), true, false);
                        player.runCommand(`scoreboard players add @a[name="${disabler(player.nameTag)}"] velocityvl 1`);
                    } catch(error) {}
                }
            }
        }
    }, 40); // Executes every 2 seconds
};

export { AntiKnockbackA };