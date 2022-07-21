const xray = [
  'minecraft:ancient_debris',
  'minecraft:diamond_ore',
  'minecraft:deepslate_diamond_ore',
  'minecraft:emerald_ore',
  'minecraft:deepslate_emerald_ore',
  'minecraft:redstone_ore',
  'minecraft:deepslate_redstone_ore',
  'minecraft:lapis_ore',
  'minecraft:deepslate_lapis_ore',
  'minecraft:gold_ore',
  'minecraft:deepslate_gold_ore',
  'minecraft:iron_ore',
  'minecraft:deepslate_iron_ore'
];

export const xrayblocks = Object.setPrototypeOf(Object.fromEntries(xray.map(v => [v, ''] as [string, ''])), null);