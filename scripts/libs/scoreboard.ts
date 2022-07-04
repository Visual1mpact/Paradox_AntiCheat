// https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/scoreboard.ts
import { ScoreboardIdentityType, ScoreboardObjective, world } from 'mojang-minecraft'
import { Dimension, Player } from 'mojang-minecraft'
const overworld = world.getDimension('overworld')

// https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/mc.ts#L33
const execCmd = (command: string, source: Dimension | Player = overworld, ignoreError = false): { statusCode: number; statusMessage: string; } => {
    try { return source.runCommand(command); }
    catch (e) {
        if (e instanceof Error) throw e;

        let r: any;
        try { r = JSON.parse(e); }
        catch { throw new Error(e); }

        if (ignoreError) return r;
        else throw r;
    }
};

const auth = Symbol()

export default class scoreboard {
    static get display() { return display }
    static get objective() { return objective }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

type displaySlot = 'sidebar' | 'list' | 'belowname'

const toExecutable = JSON.stringify

class objective {
    static readonly create = (id: string, displayName = id) => new this(id, displayName, true)
    static readonly edit = (id: string) => new this(id, id, false)
    static readonly for = (id: string, displayName = id) => new this(id, displayName, !this.exist(id))
    static readonly exist = (id: string) => {
        id = toExecutable(id)
        try {
            execCmd(`scoreboard objectives add ${id} dummy`)
            execCmd(`scoreboard objectives remove ${id}`)
            return false
        } catch {
            return true
        }
    }
    static readonly delete = (id: string) => !execCmd(`scoreboard objectives remove ${toExecutable(id)}`, undefined, true).statusCode
    static readonly getList = () => world.scoreboard.getObjectives().map(v => this.edit(v.id))

    constructor(id: string, displayName = id, create = true) {
        if (id.length > 16) throw new RangeError(`Objective identifier length cannot go more than 16 characters`)
        if (displayName.length > 32) throw new RangeError(`Objective display length cannot go more than 32 characters`)

        const execid = toExecutable(id),
            execDisplay = toExecutable(displayName)

        const exist = objective.exist(id)
        if (create) {
            if (exist) throw new TypeError(`Objective with ID '${id}' already exists.`)
            execCmd(`scoreboard objectives add ${execid} dummy ${execDisplay}`)
        } else {
            if (!exist) throw new ReferenceError(`Objective with ID '${id}' not found.`)
        }

        this.id = id
        this.execId = execid
        this.#data = world.scoreboard.getObjective(id)
        this.dummies = new dummies(auth, this, this.#data)
        this.players = new players(auth, this, this.#data)
    }

    #data: ScoreboardObjective

    readonly id: string
    readonly execId: string
    get displayName() { return this.#data.displayName }
    get data() { return this.#data }

    readonly dummies: dummies
    readonly players: players
    readonly display = new display(auth, this)
}

class players {
    constructor(key: typeof auth, obj: objective, data: ScoreboardObjective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
        this.#data = data
    }

    #obj: objective
    #data: ScoreboardObjective

    readonly 'set' = (plr: Player, score: number) => (void execCmd(`scoreboard players set @s ${this.#obj.execId} ${score}`, plr, true), this)
    readonly add = (plr: Player, score: number) => (void execCmd(`scoreboard players add @s ${this.#obj.execId} ${score}`, plr, true), this)
    readonly 'get' = (plr: Player) => {
        const r = execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true)
        if (r.statusCode) return
        return +r.statusMessage.match(/-?\d+/)?.[0]
    }

    readonly exist = (plr: Player) => !execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true).statusCode
    readonly delete = (plr: Player) => !execCmd(`scoreboard players reset @s ${this.#obj.execId}`, plr, true).statusCode
    readonly getScores = (() => {
        const t = this
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.player)
                    try { yield [participant.getEntity(), score, participant.displayName] as [player: Player, score: number, displayName: string] }
                    catch { yield [null, score, null] as [player: null, score: number, displayName: null] }
        }
    })()
}

class dummies {
    constructor(key: typeof auth, obj: objective, data: ScoreboardObjective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
        this.#data = data
    }

    #obj: objective
    #data: ScoreboardObjective

    readonly 'set' = (name: string, score: number) => (void execCmd(`scoreboard players set ${toExecutable(name)} ${this.#obj.execId} ${score}`, undefined, true), this)
    readonly add = (name: string, score: number) => (void execCmd(`scoreboard players add ${toExecutable(name)} ${this.#obj.execId} ${score}`, undefined, true), this)
    readonly 'get' = (name: string) => {
        const r = execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, undefined, true)
        if (r.statusCode) return
        return +r.statusMessage.match(/-?\d+/)?.[0]
    }

    readonly exist = (name: string) => !execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, undefined, true).statusCode
    readonly delete = (name: string) => !execCmd(`scoreboard players reset ${toExecutable(name)} ${this.#obj.execId}`, undefined, true).statusCode
    readonly getScores = (() => {
        const t = this
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.fakePlayer)
                    yield [participant.displayName, score] as [displayName: string, score: number]
        }
    })()
}

class display {
    static readonly setDisplay = (displaySlot: displaySlot, scoreboard: objective | string) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${scoreboard instanceof objective ? scoreboard.execId : toExecutable(scoreboard)}`, undefined, true).statusCode
    static readonly clearDisplay = (displaySlot: displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot}`, undefined, true).statusCode

    constructor(key: typeof auth, obj: objective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
    }

    #obj: objective

    readonly setDisplay = (displaySlot: displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${this.#obj.execId}`, undefined, true).statusCode
    readonly clearDisplay = display.clearDisplay
}
