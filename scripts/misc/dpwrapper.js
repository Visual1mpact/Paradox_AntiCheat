import { Player, PropertyRegistry, World } from "mojang-minecraft";
import config from "../data/config.js";
import scoreboard from "../libs/scoreboard.js";

if (config.dynamicPropertyWrapper.enabled) {
    // cancel registration
    PropertyRegistry.prototype.registerEntityTypeDynamicProperties = () => {}
    PropertyRegistry.prototype.registerWorldDynamicProperties = () => {}

    // thing?
    const uniqueID = config.dynamicPropertyWrapper.uniqueID.slice(0, 6);

    const getPropertyDatas = (scoreObj) => {
        const data = Object.create(null)
        for (const [name] of scoreObj.getScores()) {
            // parse the saved value
            const [match, id, type] = name.match(/(.*?)\|\|(string|number|boolean)\|\|/) ?? []
    
            // skip if match is undefined (misformatted)
            if (typeof match == 'undefined') continue
    
            // parse value
            const valueStr = name.substring(match.length),
                value = type == 'number' ? +valueStr
                    : type == 'boolean' ? valueStr == 'true'
                    : JSON.parse(`"${valueStr}"`)
            
            // add the value in property list
            data[JSON.parse(`"${id}"`)] = {
                cachedValue: value,
                scoreboardName: `${id}||${type}||${value}`
            }
        }
        return data
    }

    // world dynamic property
    const worldObj = scoreboard.objective.for(`${uniqueID}:wld`).dummies;
    const worldPropertyList = getPropertyDatas(worldObj)

    World.prototype.getDynamicProperty = (id) => {
        return worldPropertyList[id]?.cachedValue
    }
    World.prototype.setDynamicProperty = (id, value) => {
        const vtype = typeof value
        if (vtype != 'string' && vtype != 'number' && vtype != 'boolean') throw new TypeError(`Unexpected value type ${vtype}`)

        // delete existing
        const propData = worldPropertyList[id] ??= {}
        if (propData.scoreboardName !== undefined) worldObj.delete(propData.scoreboardName)

        // set
        propData.cachedValue = value
        worldObj.set(propData.scoreboardName = `${id}||${vtype}||${value}`, 0)
    }
    World.prototype.removeDynamicProperty = (id) => {
        if (!(id in worldPropertyList)) return false

        // delete
        worldObj.delete(worldPropertyList[id].scoreboardName)
        delete worldPropertyList[id]

        return true
    }

    // player dynamic property
    Player.prototype.getDynamicProperty = function(id) {
        return getDataOfPlayer(this).data[id]?.cachedValue
    }
    Player.prototype.setDynamicProperty = function(id, value) {
        const vtype = typeof value
        if (vtype != 'string' && vtype != 'number' && vtype != 'boolean') throw new TypeError(`Unexpected value type ${vtype}`)

        const {obj, data} = getDataOfPlayer(this)

        // delete existing
        const propData = data[id] ??= {}
        if (propData.scoreboardName !== undefined) obj.delete(propData.scoreboardName)

        // set
        propData.cachedValue = value
        obj.set(propData.scoreboardName = `${id}||${vtype}||${value}`, 0)
    }
    Player.prototype.removeDynamicProperty = function (id) {
        const {obj, data} = getDataOfPlayer(this)
        if (!(id in data)) return false

        // delete
        obj.delete(data[id].scoreboardName)
        delete data[id]

        return true
    }

    // player data & uid registry
    const staticUidRegistry = scoreboard.objective.for(`${uniqueID}:uidreg`).players;
    const dataList = new WeakMap()
    const getDataOfPlayer = (plr) => {
        // return if player data has already been set
        if (dataList.has(plr)) return dataList.get(plr)

        // set the player uid
        staticUidRegistry.set(plr, 0)

        // sets the player obj & data
        const obj = scoreboard.objective.for(`${uniqueID}:plr:${plr.scoreboard.id.toString(36)}`).dummies
        dataList.set(plr, { obj: obj, data: getPropertyDatas(obj) })

        // return player obj & data
        return dataList.get(plr)
    }
}