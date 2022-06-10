import { Dimension, Entity, Player } from 'mojang-minecraft'
import getStack from './stack.js'

const DORC = Dimension.prototype.runCommand

for (const v of [ Dimension, Entity, Player ]) {
    const ORC = v.prototype.runCommand
    v.prototype.runCommand = function(cmd) {
        console.log(`Run command on ${v.name} (${this.id}): ${cmd} \n${getStack()}`)
        try { return ORC.call(this, cmd) }
        catch(e) {
            console.log(`Run command throws error:\nCommand: ${cmd}\nError: ${e} \n${getStack()}`)
            throw e
        }
    }
}

export default DORC
