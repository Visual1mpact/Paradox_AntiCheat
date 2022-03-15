import { world, Player } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import { disabler, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function illegalitemsb(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsB.enabled === false) {
        World.events.beforeItemUseOn.unsubscribe(illegalitemsb);
        return;
    }

    // Properties from class
    let { item, source, cancel } = object;

    // Only fire if entity is a Player
    if (!(source instanceof Player)) {
        return;
    }

    // If somehow they bypass illegalitems/A then snag them when they use the item
    if (illegalitems.includes(item.id) && !source.hasTag('paradoxOpped')) {
        flag(source, "IllegalItems", "B", "Exploit", false, false, false, false);
        cancel = true;
        source.runCommand(`clear "${disabler(source.nameTag)}" ${item.id}`);
        let tags = source.getTags();

        // This removes old ban tags
        tags.forEach(t => {
            if(t.startsWith("Reason:")) {
                source.removeTag(t);
            }
            if(t.startsWith("By:")) {
                source.removeTag(t);
            }
        });
        try {
            source.runCommand(`tag "${disabler(source.nameTag)}" add "Reason:Illegal Item"`);
            source.runCommand(`tag "${disabler(source.nameTag)}" add "By:Paradox"`);
            source.addTag('isBanned');
        } catch (error) {
            source.triggerEvent('paradox:kick');
        }
    }
}

const IllegalItemsB = () => {
    World.events.beforeItemUseOn.subscribe(object => illegalitemsb(object));
};

export { IllegalItemsB };
