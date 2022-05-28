import { world } from 'mojang-minecraft'
import viewobj from './viewobj.js'
import orc from './runcommand.js'

const { log: OLog, info: OInfo, warn: OWarn, error: OError } = console
const rc = orc.bind(world.getDimension('overworld'))

const r = (v, fn, showChat = false) => {
    const s = v.map(v => '[Paradox Debugging]\u00a7< ' + ( typeof v == 'string' ? v : viewobj(v) ) + ' \u00a7>' ).join('\n')
    fn('\n' + s)
    if (showChat) rc(`say \u00a7f${s}`)
}

console.log = (...data) => r(data, OLog, true)
console.info = (...data) => r(data, OInfo, true)
console.warn = (...data) => r(data, OWarn)
console.error = (...data) => r(data, OError)
