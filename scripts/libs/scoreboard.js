// https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/scoreboard.ts
// transpiled from typescript to javascript

// https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/mc.ts#L33
/** @type { (command: string, source?: Dimension, ignoreError?: boolean) => {statusCode: number, statusMessage: string} } */
const execCmd = (command, source = dim, ignoreError = false) => {
    try { return source.runCommand(command); }
    catch (e) {
        if (e instanceof Error) throw e;

        let r;
        try { r = JSON.parse(e); }
        catch { throw new Error(e); }

        if (ignoreError) return r;
        else throw r
    }
};

import { Dimension, ScoreboardIdentityType, world } from 'mojang-minecraft';
const dim = world.getDimension('overworld')
const auth = Symbol();
export default class scoreboard {
    static get display() { return display; }
    static get objective() { return objective; }
    constructor() { throw new TypeError('Class is not constructable'); }
}
const toExecutable = JSON.stringify;
class objective {
    static create = (id, displayName = id) => new this(id, displayName, true);
    static edit = (id) => new this(id, id, false);
    static for = (id, displayName = id) => new this(id, displayName, !this.exist(id));
    static exist = (id) => {
        id = toExecutable(id);
        try {
            execCmd(`scoreboard objectives add ${id} dummy`);
            execCmd(`scoreboard objectives remove ${id}`);
            return false;
        }
        catch {
            return true;
        }
    };
    static delete = (id) => !execCmd(`scoreboard objectives remove ${toExecutable(id)}`, dim, true).statusCode;
    static getList = () => world.scoreboard.getObjectives().map(v => this.edit(v.id));
    constructor(id, displayName = id, create = true) {
        if (id.length > 16)
            throw new RangeError(`Objective identifier length cannot go more than 16 characters`);
        if (displayName.length > 32)
            throw new RangeError(`Objective display length cannot go more than 32 characters`);
        const execid = toExecutable(id), execDisplay = toExecutable(displayName);
        const exist = objective.exist(id);
        if (create) {
            if (exist)
                throw new TypeError(`Objective with ID '${id}' already exists.`);
            execCmd(`scoreboard objectives add ${execid} dummy ${execDisplay}`);
        }
        else {
            if (!exist)
                throw new ReferenceError(`Objective with ID '${id}' not found.`);
        }
        this.id = id;
        this.execId = execid;
        this.#data = world.scoreboard.getObjective(id);
        this.dummies = new dummies(auth, this, this.#data);
        this.players = new players(auth, this, this.#data);
    }
    #data;
    id;
    execId;
    get displayName() { return this.#data.displayName; }
    get data() { return this.#data; }
    dummies;
    players;
    display = new display(auth, this);
}
class players {
    constructor(key, obj, data) {
        if (key !== auth)
            throw new TypeError('Class is not constructable');
        this.#obj = obj;
        this.#data = data;
    }
    #obj;
    #data;
    'set' = (plr, score) => (void execCmd(`scoreboard players set @s ${this.#obj.execId} ${score}`, plr, true), this);
    add = (plr, score) => (void execCmd(`scoreboard players add @s ${this.#obj.execId} ${score}`, plr, true), this);
    'get' = (plr) => {
        const r = execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true);
        if (r.statusCode)
            return;
        return +r.statusMessage.match(/-?\d+/)?.[0];
    };
    exist = (plr) => !execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true).statusCode;
    delete = (plr) => !execCmd(`scoreboard players reset @s ${this.#obj.execId}`, plr, true).statusCode;
    getScores = (() => {
        const t = this;
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.player)
                    try {
                        yield [participant.getEntity(), score, participant.displayName];
                    }
                    catch {
                        yield [null, score, null];
                    }
        };
    })();
}
class dummies {
    constructor(key, obj, data) {
        if (key !== auth)
            throw new TypeError('Class is not constructable');
        this.#obj = obj;
        this.#data = data;
    }
    #obj;
    #data;
    'set' = (name, score) => (void execCmd(`scoreboard players set ${toExecutable(name)} ${this.#obj.execId} ${score}`, dim, true), this);
    add = (name, score) => (void execCmd(`scoreboard players add ${toExecutable(name)} ${this.#obj.execId} ${score}`, dim, true), this);
    'get' = (name) => {
        const r = execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim, true);
        if (r.statusCode)
            return;
        return +r.statusMessage.match(/-?\d+/)?.[0];
    };
    exist = (name) => !execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim, true).statusCode;
    delete = (name) => !execCmd(`scoreboard players reset ${toExecutable(name)} ${this.#obj.execId}`, dim, true).statusCode;
    getScores = (() => {
        const t = this;
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.fakePlayer)
                    yield [participant.displayName, score];
        };
    })();
}
class display {
    static setDisplay = (displaySlot, scoreboard) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${scoreboard instanceof objective ? scoreboard.execId : toExecutable(scoreboard)}`, dim, true).statusCode;
    static clearDisplay = (displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot}`, dim, true).statusCode;
    constructor(key, obj) {
        if (key !== auth)
            throw new TypeError('Class is not constructable');
        this.#obj = obj;
    }
    #obj;
    setDisplay = (displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${this.#obj.execId}`, dim, true).statusCode;
    clearDisplay = display.clearDisplay;
}
