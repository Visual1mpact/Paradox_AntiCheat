//https://github.com/frostice482/server-expansion/blob/main/dev/src/libcore/misc.ts#L7

export default (function viewObj() {
    // definitions
    const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor,
        AsyncFunction = Object.getPrototypeOf(async()=>{}).constructor,
        AsyncGeneratorFunction = Object.getPrototypeOf(async function*() {}).constructor,
        errUnknown = '§c[Unknown]§r',
        defTab = ' §8:§r ',
        defStrEscDict = {
            '\t': 'TAB',
            '\v': 'VTAB',
            '\r': 'CR',
            '\n': 'LF',
            '\f': 'FF',
            '\0': 'NUL',
        },
        defStrColorDict = {
            '§0': 'BLACK',
            '§1': 'DBLUE',
            '§2': 'DGRN',
            '§3': 'DAQUA',
            '§4': 'DRED',
            '§5': 'DPURP',
            '§6': 'GOLD',
            '§7': 'GRAY',
            '§8': 'DGRAY',
            '§9': 'BLUE',
            '§a': 'GRN',
            '§b': 'AQUA',
            '§c': 'RED',
            '§d': 'PURP',
            '§e': 'YLW',
            '§f': 'WHITE',
            '§g': 'GOLD',
        },
        defStrFormatDict = {
            '§k': 'OBF',
            '§l': 'BOLD',
            '§o': 'RESET',
            '§r': 'ITLC',
        };

    const keyFormat = (k) => typeof k == 'symbol' ? `§a${String(k)}§r` : k[0] == '_' ? `§7${k}§r` : k;

    /**
     * main execution function
     * @param obj Object to be parsed
     * @param oTab Tab
     * @param tab Current tab level
     * @param objlist Object list
     * @param addObj Object to be added
     * @return {string}
     */
    // theres a lot of involvement between class instance and class prototype, so we must be careful
    const exec = ( obj, oTab = defTab, tab = oTab, objlist = [], addObj = obj ) => {
        if (objlist.includes(obj)) return '§b[Circular]';

        if (obj === null || obj === undefined) return `§8${obj}`;
        const objConstructor = Object.getPrototypeOf(obj)?.constructor,
            constructorIsObject = objConstructor === Object || objConstructor == null,
            constructorIsFunction = [ Function, GeneratorFunction, AsyncFunction, AsyncGeneratorFunction ].includes(objConstructor);

        const o = [];

        const prevTab = tab.slice(0, -oTab.length),
            nextTab = tab + oTab;
        const kv = (k) => {
                const headings = `${tab} ${keyFormat(k)}${getGetterSetter(k)}: `;
                try { return headings + exec( obj[k], oTab, nextTab, objlist.concat([addObj]), obj[k] ); }
                catch { return headings + errUnknown; }
            },
            getKeys = () => {
                if (constructorIsObject) {
                    return new Set( Reflect.ownKeys(obj) );
                } else {
                    // we want to get keys of an object
                    // from the prototype, if object constructor is a native function, use the object instance, otherwise use object constructor's prototype and object instance
                    // when using the object constructor's prototype, we need to check if the value still exists in the object instance
                    const o = new Set(
                        constructorIsFunction ? Reflect.ownKeys(obj)
                        : Reflect.ownKeys(objConstructor.prototype).filter(v => v in obj).concat(Reflect.ownKeys(obj))
                    );
                    // delete all keys
                    // from the prototype, if object constructor is a native function, delete function properties
                    if (constructorIsFunction) {
                        o.delete('length');
                        o.delete('name');
                        o.delete('arguments');
                        o.delete('caller');
                        o.delete('prototype');
                        o.delete('constructor');
                    // from the prototype, if object constructor is a function, delete 'constructor' property
                    } else if (!constructorIsObject) {
                        o.delete('constructor');
                    }
                    return o;
                }
            },
            getGetterSetter = (k) => {
                // we want to get a property descriptor of an object property
                // first we will try getting the property descriptor from the object instance directly
                // if undefined we will use the object's constructor prototype but we need to check if the value still exists in the object instance, otherwise null
                // if still undefined returns empty object
                const { get, set } = Reflect.getOwnPropertyDescriptor(obj, k)
                    ?? ( k in obj ? Reflect.getOwnPropertyDescriptor(objConstructor.prototype, k) : null )
                    ?? {};
                return get && set ? ` §b[Get/Set]§r `
                    : get ? ` §b[Get]§r `
                    : set ? ` §b[Set]§r `
                    : '';
            };

        try {
            switch (objConstructor) {
                case String:
                    return `§7"§r${ obj.replace( /[\t\r\n\v\f\0]|§./g, (v) => v in defStrEscDict ? `§d[${defStrEscDict[v]}]§r` : v in defStrColorDict ? `§b[${defStrColorDict[v]}]§r` : v in defStrFormatDict ? `§a[${defStrFormatDict[v]}]§r` : `§8[S${v.slice(-1)}]§r` ) }§7"§r`;
                
                case Number:
                    return `§a${obj}§r`;
                
                case Boolean:
                    return `§a${obj}§r`;
                
                case RegExp:
                    return `§c${obj}§r`;
                
                case Symbol:
                    return `§b${String(obj)}§r`;
                
                case AsyncFunction:
                case AsyncGeneratorFunction:
                case GeneratorFunction:
                case Function: {
                    /**
                     * class test
                     * `0`: arrow function
                     * `1`: function
                     * `2`: class
                     * else is unknown
                     */
                    let l = 0;
                    if (obj.prototype) l++;
                    if (!( Object.getOwnPropertyDescriptor(obj, 'prototype')?.writable ?? true )) l++;
                    const cn = obj.name || '(anonymous)';

                    o.push(
                        objConstructor == AsyncGeneratorFunction ? `§e[AsyncGeneratorFunction: ${cn}]§r`
                        : objConstructor == AsyncFunction ? `§e[AsyncFunction: ${cn}]§r`
                        : objConstructor == GeneratorFunction ? `§e[GeneratorFunction: ${cn}]§r`
                        : l == 0 || l == 1 ? `§e[Function: ${cn}]§r`
                        : l == 2 ? `§b[Class: ${cn}]§r`
                        : ''
                    );

                    const keys = getKeys();
                    if (keys.size) {
                        o[0] += ' {';
                        for (const k of keys) o.push( kv(k) );
                        o.push(`${prevTab} }`);
                    }

                    return o.join('\n§r');
                }

                case Error:
                case TypeError:
                case ReferenceError:
                case RangeError:
                case SyntaxError:
                case Promise:
                    return `§b[${objConstructor.name}]§r`;

                case Array: {
                    if (!obj.length) return `[] §7Array<0>`;

                    o.push(`[ §7Array<${obj.length}>`);
                    for (const k in obj) o.push( kv(k) );
                    o.push(`${prevTab} ]`);

                    return o.join('\n§r');
                }

                case Set: {
                    if (!obj.size) return `[] §7Set<0>`;

                    o.push(`[ §7Set<${obj.size}>`);
                    for (const v of obj) o.push( `${tab} => ` + exec( v, oTab, nextTab, objlist.concat([addObj]), v ) );
                    o.push(`${prevTab} ]`);

                    return o.join('\n§r');
                }

                case Map: {
                    if (!obj.size) return `[] §7Map<0>`;

                    o.push(`[ §7Map<${obj.size}>`);
                    for (const [a, b] of obj) o.push( `${tab} => ${exec( a, oTab, nextTab, objlist.concat([addObj]), a )} -> ${exec( b, oTab, nextTab, objlist.concat([addObj]), b )}` );
                    o.push(`${prevTab} ]`);

                    return o.join('\n§r');
                }

                default: {
                    let constructorName = objConstructor != Object ? objConstructor?.name ?? '[Object: null prototype]' : '';

                    const keys = getKeys();
                    if (!keys.size) return `{} §7${constructorName}§r`;

                    o.push(`{ §7${constructorName}§r`);
                    for (const k of keys) o.push( kv(k) );
                    o.push(`${prevTab} }`);

                    return o.join('\n§r');
                }
            }
        } catch {
            return errUnknown;
        }
    };
    /**
    * Generates a readable object.
    * @param obj Object.
    * @param tab Tab.
    */
    return (obj, tab = defTab) => exec(obj, tab);
})();
