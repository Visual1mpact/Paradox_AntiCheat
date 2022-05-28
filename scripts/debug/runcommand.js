import { Dimension, Entity, Player } from 'mojang-minecraft'

const DORC = Dimension.prototype.runCommand

for (const v of [ Dimension, Entity, Player ]) {
    const ORC = v.prototype.runCommand
    v.prototype.runCommand = function(cmd) {
        console.log(`Run command on ${v.name} (${this.id}): ${cmd}\n${Error().stack.replace(/^.*\n?/, '')}`)
        try { return ORC.call(this, cmd) }
        catch(e) {
            console.log(`Run command throws error:\nCommand: ${cmd}\nError: ${e}\n${Error().stack.replace(/^.*\n?/, '')}`)
            throw e
        }
    }
}

export default DORC
