import { Dimension, Entity, Player } from 'mojang-minecraft'
import config from '../data/config.js'
import getStack from './stack.js'

const DORC = Dimension.prototype.runCommand

for (const v of [ Dimension, Entity, Player ]) {
    const ORC = v.prototype.runCommand
    v.prototype.runCommand = function(cmd) {
        if (config.debug) console.log(`Run command on ${v.name} (${this.id}): ${cmd} \n${getStack()}`)
        try { return ORC.call(this, cmd) }
        catch(e) {
            if (config.debug) console.warn(`Run command throws error:\nCommand: ${cmd}\nError: ${e} ${getStack()}`)
            throw e
        }
    }
}

export default DORC
