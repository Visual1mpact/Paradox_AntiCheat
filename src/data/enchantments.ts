// https://docs.microsoft.com/en-us/minecraft/creator/scriptapi/mojang-minecraft/enchantmentslot

// Maximum enchantment level per enchantments.
const maxLevel = {
    protection: 4,
    fireProtection: 4,
    featherFalling: 4,
    blastProtection: 4,
    projectileProtection: 4,
    thorns: 3,
    respiration: 3,
    depthStrider: 3,
    aquaAffinity: 1,
    sharpness: 5,
    smite: 5,
    baneOfArthropods: 5,
    knockback: 2,
    fireAspect: 2,
    looting: 3,
    efficiency: 5,
    silkTouch: 1,
    unbreaking: 3,
    fortune: 3,
    power: 5,
    punch: 2,
    flame: 1,
    infinity: 1,
    luckOfTheSea: 3,
    lure: 3,
    frostWalker: 2,
    mending: 1,
    binding: 1,
    vanishing: 1,
    impaling: 5,
    riptide: 3,
    loyalty: 3,
    channeling: 1,
    multishot: 1,
    piercing: 4,
    quickCharge: 3,
    soulSpeed: 3,
    swiftSneak: 3,
} as const;

const compatibles = <List extends (keyof typeof maxLevel)[]>(compatibleEnchantments: List): { [K in List[number]]: typeof maxLevel[K] } => {
    const obj = Object.create(null);
    for (const ench of compatibleEnchantments) obj[ench] = maxLevel[ench];
    return obj;
};

// Compatible enchantments per enchantment slot.
export const enchantmentSlot = {
    // None
    0: compatibles([] as []),
    // armorHead
    1: compatibles(["protection", "fireProtection", "blastProtection", "projectileProtection", "thorns", "respiration", "aquaAffinity", "unbreaking", "mending", "binding", "vanishing"]),
    // armorTorso
    2: compatibles(["protection", "fireProtection", "blastProtection", "projectileProtection", "thorns", "unbreaking", "mending", "binding", "vanishing"]),
    // armorFeet
    4: compatibles(["protection", "fireProtection", "featherFalling", "blastProtection", "projectileProtection", "thorns", "depthStrider", "unbreaking", "frostWalker", "mending", "binding", "vanishing", "soulSpeed"]),
    // armorLegs
    8: compatibles(["protection", "fireProtection", "blastProtection", "projectileProtection", "thorns", "unbreaking", "mending", "binding", "vanishing", "swiftSneak"]),
    // gArmor
    15: compatibles(["protection", "fireProtection", "featherFalling", "blastProtection", "projectileProtection", "thorns", "respiration", "depthStrider", "aquaAffinity", "unbreaking", "frostWalker", "mending", "binding", "vanishing", "soulSpeed"]),
    // sword
    16: compatibles(["sharpness", "smite", "baneOfArthropods", "knockback", "fireAspect", "looting", "unbreaking", "mending", "vanishing"]),
    // bow
    32: compatibles(["unbreaking", "power", "punch", "flame", "infinity", "mending", "vanishing"]),
    // hoe
    64: compatibles(["efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // shears
    128: compatibles(["efficiency", "silkTouch", "unbreaking", "mending", "vanishing"]),
    // flintsteel
    256: compatibles(["unbreaking", "mending", "vanishing"]),
    // axe
    512: compatibles(["sharpness", "smite", "baneOfArthropods", "efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // pickaxe
    1024: compatibles(["efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // shovel
    2048: compatibles(["efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // gDigging
    3648: compatibles(["sharpness", "smite", "baneOfArthropods", "efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // fishingRod
    4096: compatibles(["unbreaking", "luckOfTheSea", "lure", "mending", "vanishing"]),
    // carrotStick
    8192: compatibles(["unbreaking", "mending", "vanishing"]),
    // elytra
    16384: compatibles(["unbreaking", "mending", "binding", "vanishing"]),
    // spear
    32768: compatibles(["unbreaking", "mending", "vanishing", "impaling", "riptide", "loyalty", "channeling"]),
    // crossbow
    65536: compatibles(["unbreaking", "mending", "vanishing", "multishot", "piercing", "quickCharge"]),
    // shield
    131072: compatibles(["unbreaking", "mending", "vanishing"]),
    // gTool
    131520: compatibles(["efficiency", "silkTouch", "unbreaking", "fortune", "mending", "vanishing"]),
    // cosmeticHead
    262144: compatibles(["binding", "vanishing"]),
    // compass
    524288: compatibles(["binding", "vanishing"]),
    // warped fungus on a stick
    1048576: compatibles(["binding", "vanishing"]),
    // All
    "-1": compatibles([
        "protection",
        "fireProtection",
        "featherFalling",
        "blastProtection",
        "projectileProtection",
        "thorns",
        "respiration",
        "depthStrider",
        "aquaAffinity",
        "sharpness",
        "smite",
        "baneOfArthropods",
        "knockback",
        "fireAspect",
        "looting",
        "efficiency",
        "silkTouch",
        "unbreaking",
        "fortune",
        "power",
        "punch",
        "flame",
        "infinity",
        "luckOfTheSea",
        "lure",
        "frostWalker",
        "mending",
        "binding",
        "vanishing",
        "impaling",
        "riptide",
        "loyalty",
        "channeling",
        "multishot",
        "piercing",
        "quickCharge",
        "soulSpeed",
        "swiftSneak",
    ]),
};

Object.setPrototypeOf(enchantmentSlot, null);
