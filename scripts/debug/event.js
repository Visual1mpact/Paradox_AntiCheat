import { world } from 'mojang-minecraft'
import config from '../data/config.js'
import getStack from './stack.js'

for (const k in world.events) {
    const evSignal = world.events[k],
        OSubscribe = evSignal.subscribe.bind(evSignal),
        OUnsubscribe = evSignal.unsubscribe.bind(evSignal)

    OSubscribe(() => { if (config.debug) console.log(`Event ${k} triggered`) } )

    evSignal.subscribe = (fn) => {
        if (config.debug) console.log(`Event ${k} subscribe (${fn.name}) \n${getStack()}`)
        OSubscribe(fn)
    }
    evSignal.unsubscribe = (fn) => {
        if (config.debug) console.log(`Event ${k} unsubscribe (${fn.name}) \n${getStack()}`)
        OUnsubscribe(fn)
    }
}
