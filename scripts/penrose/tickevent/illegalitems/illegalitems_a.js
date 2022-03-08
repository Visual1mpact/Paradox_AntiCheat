import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { disabler } from "../../../util.js";

const World = Minecraft.world;

function illegalitemsa() {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsA.enabled === false) {
        World.events.tick.unsubscribe(illegalitemsa);
        return;
    }
    [...World.getPlayers()].forEach(player => {

        let inventory = player.getComponent('minecraft:inventory').container;
        let inventory_items = [];
        for (let i = 0; i < inventory.size; i++) {
            try {
                let inventory_i = inventory.getItem(i);
                inventory_items.push(inventory_i.id);
            } catch (error) {}
        }

        // If player has an illegal item we clear their entire inventory then kick them
        // If we cannot kick them then we despawn them (no mercy)
        inventory_items.forEach(item => {
            if (illegalitems.includes(item) && !player.hasTag('paradoxOpped') || item > config.modules.illegalitemsA.maxStack && !player.hasTag('paradoxOpped')) {
                let tags = player.getTags();

                // This removes old ban tags
                tags.forEach(t => {
                    if(t.startsWith("Reason:")) {
                        player.removeTag(t);
                    }
                    if(t.startsWith("By:")) {
                        player.removeTag(t);
                    }
                });
                try {
                    player.runCommand(`clear "${disabler(player.nameTag)}"`);
                } catch (error) {}
                try {
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Item"`);
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
                    player.addTag('isBanned');
                } catch (error) {
                    player.triggerEvent('paradox:kick');
                }
            }
        });
    });
}

const IllegalItemsA = () => {
    World.events.tick.subscribe(() => illegalitemsa());
};

export { IllegalItemsA };