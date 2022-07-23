/**
 * This whitelist pertains to Illegal Items C only.
 * These items are listed as illegal items in itemban.js.
 * These items are legitiment when placing down their true form so we ignore to prevent false bans.
 * Any items added to this list will be ignored by Paradox from Illegal Items C as illegal items being placed ONLY.
 */
const iicWhite = [
  "minecraft:pumpkin_stem",
  "minecraft:melon_stem",
  "minecraft:standing_sign",
  "minecraft:wall_sign",
  "minecraft:reeds",
];

export const iicWhitelist = Object.setPrototypeOf(
  Object.fromEntries(iicWhite.map((v) => [v, ""] as [string, ""])),
  null
);
