/**
 * This whitelist pertains to the newer salvage system.
 * By default this list will show three examples to demonstrate
 * how to fill in and add lists to the whitelist.
 * Any items added to this list will be completely ignored by Paradox.
 */
const white = [
    "minecraft:example1",
    "minecraft:example2",
    "minecraft:example3"
];

export const whitelist = Object.setPrototypeOf(Object.fromEntries(white.map(v => [v, ''] as [string, ''])), null);