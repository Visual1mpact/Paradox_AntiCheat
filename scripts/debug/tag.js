import { Player } from 'mojang-minecraft'
import getStack from './stack.js';

const { addTag: { value: OAddTag }, removeTag: { value: ORemoveTag } } = Object.getOwnPropertyDescriptors(Player.prototype);

Object.defineProperties(Player.prototype, {
    addTag: {
        value: function(t) {
            if (config.debug) console.log(`Tag added to ${this.name}: ${t} \n${getStack()}`);
            return OAddTag.call(this, t);
        }
    },
    removeTag: {
        value: function(t) {
            if (config.debug) console.log(`Tag removed from ${this.name}: ${t} \n${getStack()}`);
            return ORemoveTag.call(this, t);
        }
    },
})