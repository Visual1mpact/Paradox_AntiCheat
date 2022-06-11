import { Entity, Player, World, PropertyRegistry, DynamicPropertiesDefinition, EntityType } from 'mojang-minecraft'
import getStack from './stack.js'
import config from '../data/config.js'

for (const v of [ Entity, Player, World ]) {
    const oGet = v.prototype.getDynamicProperty
    v.prototype.getDynamicProperty = function(id) {
        if (config.debug) console.log(`Getting dynamic property '${id}' of ${this.constructor.name} \n${getStack()}`)
        try {
            const v = oGet.call(this, id)
            if (config.debug) console.log(`Dynamic property '${id}' of ${this.constructor.name}: '${v}' (${typeof v}) \n${getStack()}`)
            return v
        } catch(e) {
            if (config.debug) console.warn(`Get dynamic property '${id}' of ${this.constructor.name} FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }

    const oSet = v.prototype.setDynamicProperty
    v.prototype.setDynamicProperty = function(id, v) {
        if (config.debug) console.log(`Setting dynamic property '${id}' of ${this.constructor.name} to '${v}' (${typeof v}) \n${getStack()}`)
        try {
            return oSet.call(this, id, v)
        } catch(e) {
            if (config.debug) console.warn(`Set dynamic property '${id}' of ${this.constructor.name} to '${v}' (${typeof v}) FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }

    const oDel = v.prototype.removeDynamicProperty
    v.prototype.removeDynamicProperty = function(id) {
        if (config.debug) console.log(`Deleting dynamic property '${id}' of ${this.constructor.name} \n${getStack()}`)
        try {
            return oDel.call(this, id)
        } catch(e) {
            if (config.debug) console.warn(`Delete dynamic property '${id}' of ${this.constructor.name} FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }
}

const regEnt = PropertyRegistry.prototype.registerEntityTypeDynamicProperties

PropertyRegistry.prototype.registerEntityTypeDynamicProperties = function(def, type) {
    if (config.debug) console.log(`Registering dynamic properties definition to entity type '${type.id}' \n${getStack()}`)
    try {
        regEnt.call(this, def, type)
    } catch(e) {
        if (config.debug) console.warn(`Register dynamic properties definition to entity type '${type.id}' FAILED: \n${e} \n${getStack()}`)
        throw e
    }
}

const regWld = PropertyRegistry.prototype.registerWorldDynamicProperties

PropertyRegistry.prototype.registerWorldDynamicProperties = function(def) {
    if (config.debug) console.log(`Registering dynamic properties definition to world \n${getStack()}`)
    try {
        regWld.call(this, def)
    } catch(e) {
        if (config.debug) console.warn(`Register dynamic properties definition to world FAILED: \n${e} \n${getStack()}`)
        throw e
    }
}
