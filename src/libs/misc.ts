/**
 * Gets call stack.
 * @param stackDelCount Stack deletion count.
 * @returns Call stack
 */
export function getStack(stackDelCount = 1) {
    return new Error().stack.replace(new RegExp(`(.*?\\n){0,${stackDelCount}}`), "");
}

/**
 * Gets function name and its source.
 * @param fn Function.
 */
export function getFunctionName(fn: Function) {
    return `${(fn.name ?? "<native>") || "<anonymous>"} (${fn.fileName == undefined ? "<native>" : `defined at ${fn.fileName || "<anonymous>"}:${fn.lineNumber}`})`;
}

/**
 * Generates a string of random characters in the charset.
 * @param length String length.
 * @param charset Character set.
 */
export function randomstr(length: number, charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
    let o = "";
    for (let i = 0; i < length; i++) o = o.concat(charset[Math.floor(Math.random() * charset.length)] as string);
    return o;
}

/**
 * Renames a function.
 * @param fn Function to be renamed.
 * @param newName New function name.
 */
export function renameFn<Fn extends Function>(fn: Fn, newName: string | ((fnName: string) => string)): Fn {
    return Object.defineProperty(fn, "name", { value: typeof newName == "string" ? newName : newName(fn.name) });
}

export function mapToObject<arr extends PropertyKey[]>(arr: arr): Record<arr[number], null> {
    const obj = Object.create(null);
    for (const v of arr) obj[v] = null;
    return obj;
}

const tagFilterFn = {
    all: (v: number) => (v >= 1 ? 1 : 0),
    any: (v: number) => (v > 0 ? 1 : 0),
    none: (v: number) => (v == 0 ? 1 : 0),
};

/**
 * Tests tag filter.
 * @param filter Tag filter.
 * @param tags Tags.
 * @returns Number -- 1 = all tests passed, 0 < x < 1 = some tests passed, 0 = no tests passed
 */
export function testTagFilter(filter: tagFilter, tags: string[] | Record<string, null>) {
    let count = 0,
        success = 0;
    tags = Array.isArray(tags) ? mapToObject(tags) : tags;
    if (Array.isArray(filter))
        for (const tag of filter) {
            count++;
            if (tag in tags) success++;
        }
    else {
        for (const k in filter) {
            if (k != "all" && k != "any" && k != "none") continue;
            count++;
            if (tagFilterFn[k](testTagFilter(filter[k], tags))) success++;
        }
    }
    return count == 0 ? 1 : success / count;
}

export type tagFilter = { [K in "all" | "any" | "none"]?: tagFilter } | string[];

// this is just dirty
/**
 * Creates a readable object data.
 * @param o Object.
 * @param tab Tab size.
 * @param tabSeparator Separator between tab and property.
 * @deprecated
 */
export const viewObj = (() => {
    const AsyncFunction = (async () => {}).constructor,
        GeneratorFunction = function* () {}.constructor,
        AsyncGeneratorFunction = async function* () {}.constructor,
        GeneratorObjCst = (function* () {})().constructor,
        AsyncGeneratorObjCst = (async function* () {})().constructor,
        ArrayIteratorObj = Object.getPrototypeOf(new Set().values()),
        SetIteratorObj = Object.getPrototypeOf(new Set().values()),
        MapIteratorObj = Object.getPrototypeOf(new Map().values());

    Object.defineProperty(GeneratorObjCst, "name", { value: "Generator" });
    Object.defineProperty(AsyncGeneratorObjCst, "name", { value: "AsyncGenerator" });

    const excludeProtoKeys: {
        oc: any[];
        op: any[];
        o: ((o: any) => boolean)[];
    } = {
        oc: [GeneratorObjCst, AsyncGeneratorObjCst, Promise],
        op: [ArrayIteratorObj, SetIteratorObj, MapIteratorObj],
        o: [(o) => o instanceof Error],
    };

    const strFormatKeys: Record<string, number> = Object.setPrototypeOf({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, r: 0, l: 0, o: 0 }, null),
        strEscDict = Object.setPrototypeOf(
            {
                "\t": "TAB",
                "\v": "VTAB",
                "\r": "CR",
                "\n": "LF",
                "\f": "FF",
                "\0": "NUL",
                "\ufffe": "U+FFFE",
                "\uffff": "U+FFFF",
            },
            null
        );

    const fnHead = (o: Function, oc: Function): string => {
        const fName = o.name || "<anonymous>",
            fLoc = o.fileName ? `${o.fileName}:${o.lineNumber}` : "<native>",
            notClass = Object.getOwnPropertyDescriptor(o, "prototype")?.writable ?? true,
            asyncText = oc == AsyncFunction || oc == AsyncGeneratorFunction ? "Async" : "",
            generatorText = oc == GeneratorFunction || oc == AsyncGeneratorFunction ? "Generator" : "",
            prototypeOf = Object.getPrototypeOf(o),
            extendsClass = prototypeOf instanceof Function;
        return notClass ? `§e[${asyncText}${generatorText}Function: ${fName} (${fLoc})]§r` : `§b[Class: ${fName}${extendsClass ? ` (extends: ${fnHead(prototypeOf, prototypeOf.constructor).replace(/\u00a7./g, "")})` : ""} (${fLoc})]§r`;
    };

    const getKeys = (o: any, op = Object.getPrototypeOf(o), getPrototypeKeys = true, excludeKeys: string[] = []) => {
        let keys = Reflect.ownKeys(o);
        if (getPrototypeKeys) keys = keys.concat(Reflect.ownKeys(op ?? {}));

        let keysSet = new Set(keys);
        for (const ek of excludeKeys) keysSet.delete(ek);

        return Array.from(keysSet, (k) => {
            const descriptor = Object.getOwnPropertyDescriptor(o, k) ?? Object.getOwnPropertyDescriptor(op, k) ?? {},
                isGet = Boolean(descriptor.get),
                isSet = Boolean(descriptor.set);
            return {
                key: k,
                isGet,
                isSet,
            };
        });
    };

    const formatKey = (k: string | symbol, isGet = false, isSet = false) => `${typeof k == "symbol" ? "§a" : k[0] == "_" ? "§7" : ""}${String(k)}${isGet && isSet ? " §b[Get/Set]§r " : isGet ? " §b[Get]§r " : isSet ? " §b[Set]§r " : ""}§r`;

    const exec = (o: any, stack: any[], tab: string, tabLevel: number, tabSeparator: string) => {
        if (stack.includes(o)) return `§b[Circular]§r`;
        if (o == null) return `§8${o}§r`;

        const nStack = stack.concat([o]),
            cTab = tab.repeat(tabLevel),
            nTab = tab.repeat(tabLevel + 1),
            nTabLvl = tabLevel + 1,
            execNext = (k?: PropertyKey, obj?: any) => {
                try {
                    return exec(obj ?? (k ? o[k] : obj), nStack, tab, nTabLvl, tabSeparator);
                } catch (e) {
                    return `§c[Error]§r`;
                }
            };

        const op = Object.getPrototypeOf(o),
            oc = op?.constructor;

        switch (oc) {
            case String:
                return `§7"§r${o.replace(/[\t\r\n\v\f\0\ufffe\uffff]|§./g, ([v = "", a = ""]: string) => (v == "§" ? (a in strFormatKeys ? `§a[S${a}]§r` : `§7[S${a == "§" ? "S" : a}]§r`) : `§d[${strEscDict[v]}]§r`))}§7"§r`;

            case Number:
            case Boolean:
                return `§a${o}§r`;

            case RegExp:
                return `§c${o}§r`;

            case Symbol:
                return `§b${String(o)}§r`;

            case Function:
            case AsyncFunction:
            case GeneratorFunction:
            case AsyncGeneratorFunction: {
                const out = [fnHead(o, oc)];

                const keys = getKeys(o, op, false, ["length", "name", "prototype", "arguments", "caller"]);
                if (keys.length) {
                    out[0] += " {";
                    for (const { key, isGet, isSet } of keys) out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`);
                    out.push(`${cTab}${tabSeparator}}`);
                }

                return out.join("\n");
            }

            case Array: {
                if (!o.length) return `[] §7Array<${o.length}>§r`;

                // one hell of a mess
                const out = [`[ §7Array<${o.length}>§r`];
                let exclude: Record<string, 0> = Object.create(null); //!
                for (const k in o) {
                    exclude[k] = 0; //!
                    out.push(`${nTab}${tabSeparator}${formatKey(k)}: ${execNext(k)}`);
                }
                for (let i = 0; i < o.length; i++) if (i in o && !(i in exclude)) out.push(`${nTab}${tabSeparator}${i} §7[F]§r : ${execNext(o[i])}`); //!
                out.push(`${cTab}${tabSeparator}]`);

                return out.join("\n");
            }

            case Set: {
                if (!o.size) return `[] §7Set<${o.size}>§r`;

                const out = [`[ §7Set<${o.size}>§r`];
                for (const v of o) out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(undefined, v)}`);
                out.push(`${cTab}${tabSeparator}]`);

                return out.join("\n");
            }

            case Map: {
                if (!o.size) return `{} §7Map<${o.size}>§r`;

                const out = [`{ §7Map<${o.size}>§r`];
                for (const [k, v] of o) out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(undefined, k)} -> ${execNext(undefined, v)}`);
                out.push(`${cTab}${tabSeparator}}`);

                return out.join("\n");
            }

            default: {
                let name = oc == null ? `[${o[Symbol.toStringTag] ?? "Object"}: null prototype]` : oc != Object ? oc.name : Symbol.toStringTag in o ? `Object [${o[Symbol.toStringTag]}]` : "",
                    getPrototypeKeys = !(oc == Object || excludeProtoKeys.o.some((fn) => fn(o)) || excludeProtoKeys.oc.some((v) => oc == v) || excludeProtoKeys.op.some((v) => op == v)),
                    excludeKeys = oc != Object ? ["constructor"] : [];

                const keys = getKeys(o, op, getPrototypeKeys, excludeKeys);
                if (!keys.length) return `{} §7${name}§r`;

                const out = [`{ §7${name}§r`];
                for (const { key, isGet, isSet } of keys) out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`);
                out.push(`${cTab}${tabSeparator}}`);

                return out.join("\n");
            }
        }
    };

    /**
     * Creates a readable object data.
     * @param o Object.
     * @param tab Tab size.
     * @param tabSeparator Separator between tab and property.
     * @deprecated
     */
    return (o: any, tab = " §8:§r ", tabSeparator = " ") => exec(o, [], tab, 0, tabSeparator);
})();

/**t
 * Compiles a format to formatter.
 * @param format Format.
 * @returns Formatter.
 */
export function createFormatter(format: string): (ctx: any) => string {
    const rx = /\$(?<obj>((?<=\$|\.)\w+\.?)+)((?<!\.)\((?<args>.*?)\))?(?<!\.)/g;
    let exec: RegExpExecArray | null;

    let out = "";

    while ((exec = rx.exec(format))) {
        out += format.substring(0, exec.index).replace(/[\\$`]/g, "\\$&");
        format = format.substring(rx.lastIndex);
        rx.lastIndex = 0;

        const { obj, args } = exec.groups ?? {};
        out += `\${${obj}${args != undefined ? `(${args.split("|").map((arg) => (arg.startsWith("$") ? arg.slice(1) : JSON.stringify(arg)))})` : ""}}`;
    }
    out += format.replace(/[\\$`]/g, "\\$&");

    return new Function(`ctx`, `with (ctx) return \`${out}\``) as any;
}

export class ExtArray<T, Args extends Array<any>> extends Array<T> {
    constructor(onAdd: (args: Args) => T, selm: Iterable<T> = []) {
        super(...selm);
        this.#onAdd = onAdd;
    }

    #onAdd;

    add(...args: Args) {
        this.unshift(this.#onAdd(args));
        return this;
    }
    addBack(...args: Args) {
        this.push(this.#onAdd(args));
        return this;
    }
    addAt(index: number, ...args: Args) {
        this.splice(index, 0, this.#onAdd(args));
        return this;
    }
    remove() {
        return this.shift();
    }
    removeBack() {
        return this.pop();
    }
    removeAt(index: number) {
        return this.splice(index, 1)[0];
    }
}
