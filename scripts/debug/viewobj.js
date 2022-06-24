//https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/misc.ts#L7
// transpiled from typescript to javascript

const viewObj = (() => {
    const AsyncFunction = (async () => { }).constructor, GeneratorFunction = (function* () { }).constructor, AsyncGeneratorFunction = (async function* () { }).constructor, GeneratorObjCst = (function* () { })().constructor, AsyncGeneratorObjCst = (async function* () { })().constructor, ArrayIteratorObj = Object.getPrototypeOf(new Set().values()), SetIteratorObj = Object.getPrototypeOf(new Set().values()), MapIteratorObj = Object.getPrototypeOf(new Map().values());
    Object.defineProperty(GeneratorObjCst, 'name', { value: 'Generator' });
    Object.defineProperty(AsyncGeneratorObjCst, 'name', { value: 'AsyncGenerator' });
    const excludeProtoKeys = {
        oc: [
            GeneratorObjCst,
            AsyncGeneratorObjCst,
            Promise
        ],
        op: [
            ArrayIteratorObj,
            SetIteratorObj,
            MapIteratorObj
        ],
        o: [
            (o) => o instanceof Error
        ]
    };
    const strFormatKeys = Object.setPrototypeOf({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, r: 0, l: 0, o: 0 }, null),
    strEscDict = Object.setPrototypeOf({
        '\t': 'TAB',
        '\v': 'VTAB',
        '\r': 'CR',
        '\n': 'LF',
        '\f': 'FF',
        '\0': 'NUL',
        '\ufffe': 'U+FFFE',
        '\uffff': 'U+FFFF',
    }, null);
    const fnHead = (o, oc) => {
        const fName = o.name || '<anonymous>', fLoc = o.fileName ? `${o.fileName}:${o.lineNumber}` : '<native>', notClass = Object.getOwnPropertyDescriptor(o, 'prototype')?.writable ?? true, asyncText = oc == AsyncFunction || oc == AsyncGeneratorFunction ? 'Async' : '', generatorText = oc == GeneratorFunction || oc == AsyncGeneratorFunction ? 'Generator' : '', prototypeOf = Object.getPrototypeOf(o), extendsClass = prototypeOf instanceof Function;
        return notClass
            ? `§e[${asyncText}${generatorText}Function: ${fName} (${fLoc})]§r`
            : `§b[Class: ${fName}${extendsClass ? ` (extends: ${fnHead(prototypeOf, prototypeOf.constructor).replace(/\u00a7./g, '')})` : ''} (${fLoc})]§r`;
    };
    const getKeys = (o, op = Object.getPrototypeOf(o), getPrototypeKeys = true, excludeKeys = []) => {
        let keys = Reflect.ownKeys(o);
        if (getPrototypeKeys)
            keys = keys.concat(Reflect.ownKeys(op ?? {}));
        let keysSet = new Set(keys);
        for (const ek of excludeKeys)
            keysSet.delete(ek);
        return Array.from(keysSet, k => {
            const descriptor = Object.getOwnPropertyDescriptor(o, k) ?? Object.getOwnPropertyDescriptor(op, k), isGet = !!descriptor.get, isSet = !!descriptor.set;
            return {
                key: k,
                isGet,
                isSet
            };
        });
    };
    const formatKey = (k, isGet = false, isSet = false) => `${typeof k == 'symbol' ? '§a' : k[0] == '_' ? '§7' : ''}${String(k)}${isGet && isSet ? ' §b[Get/Set]§r ' : isGet ? ' §b[Get]§r ' : isSet ? ' §b[Set]§r ' : ''}§r`;
    const exec = (o, stack, tab, tabLevel, tabSeparator) => {
        if (stack.includes(o))
            return `§b[Circular]§r`;
        if (o == null)
            return `§8${o}§r`;
        const nStack = stack.concat([o]), cTab = tab.repeat(tabLevel), nTab = tab.repeat(tabLevel + 1), nTabLvl = tabLevel + 1, execNext = (k, obj) => {
            try {
                return exec(obj ?? (k ? o[k] : obj), nStack, tab, nTabLvl, tabSeparator);
            }
            catch (e) {
                return `§c[Error]§r`;
            }
        };
        const op = Object.getPrototypeOf(o), oc = op?.constructor;
        switch (oc) {
            case String:
                return `§7"§r${o.replace(/[\t\r\n\v\f\0\ufffe\uffff]|§./g, ([v, a]) => v == '§' ? a in strFormatKeys ? `§a[S${a}]§r` : `§7[S${a == '§' ? 'S' : a}]§r` : `§d[${strEscDict[v]}]§r`)}§7"§r`;
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
                const keys = getKeys(o, op, false, ['length', 'name', 'prototype', 'arguments', 'caller']);
                if (keys.length) {
                    out[0] += ' {';
                    for (const { key, isGet, isSet } of keys)
                        out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`);
                    out.push(`${cTab}${tabSeparator}}`);
                }
                return out.join('\n');
            }
            case Array: {
                if (!o.length)
                    return `[] §7Array<${o.length}>§r`;
                const out = [`[ §7Array<${o.length}>§r`];
                let exclude = Object.create(null);
                for (const k in o) {
                    exclude[k] = 0;
                    out.push(`${nTab}${tabSeparator}${formatKey(k)}: ${execNext(k)}`);
                }
                for (let i = 0; i < o.length; i++)
                    if (i in o && !(i in exclude))
                        out.push(`${nTab}${tabSeparator}${i} §7[F]§r : ${execNext(i)}`);
                out.push(`${cTab}${tabSeparator}]`);
                return out.join('\n');
            }
            case Set: {
                if (!o.size)
                    return `[] §7Set<${o.size}>§r`;
                const out = [`[ §7Set<${o.size}>§r`];
                for (const v of o)
                    out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(null, v)}`);
                out.push(`${cTab}${tabSeparator}]`);
                return out.join('\n');
            }
            case Map: {
                if (!o.size)
                    return `{} §7Map<${o.size}>§r`;
                const out = [`{ §7Map<${o.size}>§r`];
                for (const [k, v] of o)
                    out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(null, k)} -> ${execNext(null, v)}`);
                out.push(`${cTab}${tabSeparator}}`);
                return out.join('\n');
            }
            default: {
                let name = oc == null ? `[${o[Symbol.toStringTag] ?? 'Object'}: null prototype]`
                    : oc != Object ? oc.name
                        : Symbol.toStringTag in o ? `Object [${o[Symbol.toStringTag]}]`
                            : '', getPrototypeKeys = !(oc == Object || excludeProtoKeys.o.some(fn => fn(o)) || excludeProtoKeys.oc.some(v => oc == v) || excludeProtoKeys.op.some(v => op == v)), excludeKeys = oc != Object ? ['constructor']
                    : [];
                const keys = getKeys(o, op, getPrototypeKeys, excludeKeys);
                if (!keys.length)
                    return `{} §7${name}§r`;
                const out = [`{ §7${name}§r`];
                for (const { key, isGet, isSet } of keys)
                    out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`);
                out.push(`${cTab}${tabSeparator}}`);
                return out.join('\n');
            }
        }
    };
    return (o, tab = ' §8:§r ', tabSeparator = ' ') => exec(o, [], tab, 0, tabSeparator);
})();
export default viewObj
