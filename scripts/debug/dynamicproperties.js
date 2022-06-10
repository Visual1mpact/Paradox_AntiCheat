import { Entity, Player, World, PropertyRegistry, DynamicPropertiesDefinition, EntityType } from 'mojang-minecraft'
import getStack from './stack.js'

for (const v of [ Entity, Player, World ]) {
    const oGet = v.prototype.getDynamicProperty
    v.prototype.getDynamicProperty = function(id) {
        console.log(`Getting dynamic property '${id}' of ${this.constructor.name} \n${getStack()}`)
        try {
            return oGet.call(this, id)
        } catch(e) {
            console.warn(`Get dynamic property '${id}' of ${this.constructor.name} FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }

    const oSet = v.prototype.setDynamicProperty
    v.prototype.setDynamicProperty = function(id, v) {
        console.log(`Setting dynamic property '${id}' of ${this.constructor.name} to '${v}' (${typeof v}) \n${getStack()}`)
        try {
            return oSet.call(this, id, v)
        } catch(e) {
            console.warn(`Set dynamic property '${id}' of ${this.constructor.name} to '${v}' (${typeof v}) FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }

    const oDel = v.prototype.removeDynamicProperty
    v.prototype.removeDynamicProperty = function(id) {
        console.log(`Deleting dynamic property '${id}' of ${this.constructor.name} \n${getStack()}`)
        try {
            return oDel.call(this, id)
        } catch(e) {
            console.warn(`Delete dynamic property '${id}' of ${this.constructor.name} FAILED: \n${e} \n${getStack()}`)
            throw e
        }
    }
}

const regEnt = PropertyRegistry.prototype.registerEntityTypeDynamicProperties

PropertyRegistry.prototype.registerEntityTypeDynamicProperties = function(def, type) {
    console.log(`Registering dynamic properties definition to entity type '${type.id}' \n${getStack()}`)
    try {
        regEnt.call(this, def, type)
    } catch(e) {
        console.warn(`Register dynamic properties definition to entity type '${type.id}' FAILED: \n${e} \n${getStack()}`)
        throw e
    }
}

const regWld = PropertyRegistry.prototype.registerWorldDynamicProperties

PropertyRegistry.prototype.registerWorldDynamicProperties = function(def) {
    console.log(`Registering dynamic properties definition to world \n${getStack()}`)
    try {
        regWld.call(this, def, type)
    } catch(e) {
        console.warn(`Register dynamic properties definition to world FAILED: \n${e} \n${getStack()}`)
        throw e
    }
}
