import { ObjectiveSortOrder, Player, ScoreboardIdentityType, ScoreboardObjective as MCSO, world } from "@minecraft/server";
import { execCmd } from "./mc.js";

export default class scoreboard {
    static get objective() {
        return ScoreboardObjective;
    }
    static get display() {
        return ScoreboardDisplay;
    }

    protected constructor() {
        throw new TypeError(`Class '${this.constructor.name}' is not constructable`);
    }
}

export class ScoreboardObjective {
    static create(id: string, displayName: string = id) {
        const obj = world.scoreboard.addObjective(id, displayName);
        return new this(PRIVATE, obj);
    }

    static get(id: string) {
        const obj = world.scoreboard.getObjective(id);
        return obj ? new this(PRIVATE, obj) : undefined;
    }

    static for(id: string, displayName: string = id) {
        return this.get(id) ?? this.create(id, displayName);
    }

    static exist(id: string) {
        return Boolean(world.scoreboard.getObjective(id));
    }

    static delete(id: string) {
        world.scoreboard.removeObjective(id);
    }

    static *getList() {
        for (const obj of world.scoreboard.getObjectives()) yield new this(PRIVATE, obj);
    }

    static *[Symbol.iterator]() {
        yield* this.getList();
    }

    constructor(KEY: typeof PRIVATE, obj: MCSO) {
        if (KEY !== PRIVATE) throw new TypeError(`Class '${this.constructor.name}' is not directly constructable`);

        this.id = obj.id;
        this.execId = JSON.stringify(obj.id);
        this.displayName = obj.displayName;
        this.data = obj;

        this.dummies = new ScoreboardDummies(PRIVATE, this);
        this.players = new ScoreboardPlayers(PRIVATE, this);
        this.display = new ScoreboardDisplay(PRIVATE, this);
    }

    readonly id: string;
    readonly execId: string;
    readonly displayName: string;
    readonly data: MCSO;

    readonly dummies: ScoreboardDummies;
    readonly players: ScoreboardPlayers;
    readonly display: ScoreboardDisplay;
}

export class ScoreboardDummies {
    constructor(KEY: typeof PRIVATE, obj: ScoreboardObjective) {
        if (KEY !== PRIVATE) throw new TypeError(`Class '${this.constructor.name}' is not directly constructable`);
        this.#obj = obj.data;
        this.#execId = obj.execId;
    }

    #obj: MCSO;
    #execId: string;

    set(name: string, score: number) {
        score = ~~score;
        return execCmd(`scoreboard players set ${JSON.stringify(name)} ${this.#execId} ${score}`, undefined, true).statusCode ? false : score;
    }

    add(name: string, score: number) {
        score = ~~score;
        return execCmd(`scoreboard players add ${JSON.stringify(name)} ${this.#execId} ${score}`, undefined, true).statusCode ? false : this.get(name) ?? NaN;
    }

    get(name: string) {
        const resp = execCmd(`scoreboard players test ${JSON.stringify(name)} ${this.#execId} * *`, undefined, true);
        return resp.statusCode ? undefined : +(resp.statusMessage.match(/-?\d+/)?.[0] ?? NaN);
    }

    exist(name: string) {
        return !execCmd(`scoreboard players test ${JSON.stringify(name)} ${this.#execId} * *`, undefined, true).statusCode;
    }

    reset(name: string) {
        return !execCmd(`scoreboard players reset ${JSON.stringify(name)} ${this.#execId}`, undefined, true).statusCode;
    }

    *getScores(): Generator<[name: string, score: number, id: number]> {
        for (const { score, participant } of this.#obj.getScores()) if (participant.type === ScoreboardIdentityType.fakePlayer) yield [JSON.parse(`"${participant.displayName}"`), score, participant.id];
    }

    *[Symbol.iterator]() {
        yield* this.getScores();
    }
}

export class ScoreboardPlayers {
    constructor(KEY: typeof PRIVATE, obj: ScoreboardObjective) {
        if (KEY !== PRIVATE) throw new TypeError(`Class '${this.constructor.name}' is not directly constructable`);
        this.#obj = obj.data;
        this.#execId = obj.execId;
    }

    #obj: MCSO;
    #execId: string;

    set(plr: Player, score: number) {
        score = ~~score;
        return execCmd(`scoreboard players set @s ${this.#execId} ${score}`, plr, true).statusCode ? false : score;
    }

    add(plr: Player, score: number) {
        score = ~~score;
        return execCmd(`scoreboard players add @s ${this.#execId} ${score}`, plr, true).statusCode ? false : this.get(plr) ?? NaN;
    }

    get(plr: Player) {
        const resp = execCmd(`scoreboard players test @s ${this.#execId} * *`, plr, true);
        return resp.statusCode ? undefined : +(resp.statusMessage.match(/-?\d+/)?.[0] ?? NaN);
    }

    exist(plr: Player) {
        return !execCmd(`scoreboard players test @s ${this.#execId} * *`, plr, true).statusCode;
    }

    reset(plr: Player) {
        return !execCmd(`scoreboard players reset @s ${this.#execId}`, plr, true).statusCode;
    }

    *getScores(): Generator<[player: Player | null, score: number, id: number]> {
        for (const { score, participant } of this.#obj.getScores()) {
            if (participant.type !== ScoreboardIdentityType.player) continue;
            try {
                yield [participant.getEntity() as Player, score, participant.id];
            } catch {
                yield [null, score, participant.id];
            }
        }
    }
    *[Symbol.iterator]() {
        yield* this.getScores();
    }
}

export class ScoreboardDisplay {
    static set(slot: displaySlots, obj?: ScoreboardObjective | MCSO, sort: "ascending" | "descending" = "descending") {
        obj ? world.scoreboard.setObjectiveAtDisplaySlot(slot, new ScoreboardObjectiveDisplayOptions(obj instanceof ScoreboardObjective ? obj.data : obj, ObjectiveSortOrder[sort])) : world.scoreboard.clearObjectiveAtDisplaySlot(slot);
    }

    static clear(slot: displaySlots) {
        this.set(slot);
    }

    constructor(KEY: typeof PRIVATE, obj: ScoreboardObjective) {
        if (KEY !== PRIVATE) throw new TypeError(`Class '${this.constructor.name}' is not directly constructable`);
        this.#obj = obj;
    }

    #obj: ScoreboardObjective;

    set(slot: displaySlots, sort: "ascending" | "descending" = "descending") {
        ScoreboardDisplay.set(slot, this.#obj, sort);
    }

    clear(slot: displaySlots) {
        ScoreboardDisplay.clear(slot);
    }
}

const PRIVATE = Symbol();

type displaySlots = "belowname" | "list" | "sidebar";
