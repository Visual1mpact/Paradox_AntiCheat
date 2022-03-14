import { world, Player } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import { disabler, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function illegalitemsb(item) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsB.enabled === false) {
        World.events.beforeItemUseOn.unsubscribe(illegalitemsb);
        return;
    }
    // Only fire if entity is a Player
    if (!(item.source instanceof Player)) {
        return;
    }
    // If somehow they bypass illegalitems/A then snag them when they use the item
    if (illegalitems.includes(item.item.id) && !item.source.hasTag('paradoxOpped')) {
        flag(item.source, "IllegalItems", "B", "Exploit", false, false, false, false);
        item.cancel = true;
        item.source.runCommand(`clear "${disabler(item.source.nameTag)}" ${item.item.id}`);
        let tags = item.source.getTags();

        // This removes old ban tags
        tags.forEach(t => {
            if(t.startsWith("Reason:")) {
                item.source.removeTag(t);
            }
            if(t.startsWith("By:")) {
                item.source.removeTag(t);
            }
        });
        try {
            item.source.runCommand(`tag "${disabler(item.source.nameTag)}" add "Reason:Illegal Item"`);
            item.source.runCommand(`tag "${disabler(item.source.nameTag)}" add "By:Paradox"`);
            item.source.addTag('isBanned');
        } catch (error) {
            item.source.triggerEvent('paradox:kick');
        }
    }
}

const IllegalItemsB = () => {
    World.events.beforeItemUseOn.subscribe(item => illegalitemsb(item));
};

export { IllegalItemsB };
