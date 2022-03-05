tellraw @s {"rawtext":[{"text":"\n§l§4Paradox AntiCheat Command Help"}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§4Gametest Is Disabled In World!"}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§4Please Enable Gametest, Cheats, and Education Edition!"}]}

tellraw @s {"rawtext":[{"text":"\n§l§4Moderation Commands"}]}

# Gametest enabled
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!help§r - Shows this help page."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!ban <username> <reason>§r - Ban the specified user."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!kick <username> <reason>§r - Kick the specified user."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!mute <username> <reason>§r - Mute the specified user."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!unmute <username> <reason>§r - Unmute the specified user."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!notify§r - Enables/Disables cheat notifications."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!credits§r - Shows credits, thats it."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!op <username>§r - Op's player in Paradox AntiCheat features."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!deop <username>§r - Revokes Op player in Paradox AntiCheat features."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!modules§r - View all enabled or disabled modules."}]}

# Gametest Disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function help§r - Shows this help page."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ op§r - Op's player in Paradox AntiCheat features."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/modules§r - View all enabled or disabled modules."}]}

tellraw @s {"rawtext":[{"text":"\n§l§4Optional Features"}]}

# Gametest enabled
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!allowgma§r - Enables/disables Gamemode 2(Adventure) to be used."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!allowgmc§r - Enables/disables Gamemode 1(Creative) to be used."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!allowgms§r - Enables/disables Gamemode 0(Survival) to be used."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!removecb§r - Enables/disables Anti Command Blocks (Clears all when enabled)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!bedrockvalidate§r - Enables/disables validation of bedrock (Such as in the nether roof or at y=0)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!overridecbe§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!nofrostwalker§r - Enables/disables Anti Frost Walker. High levels of Frost Walker can crash realms."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!worldborder§r - Enables/disables the World Border and its size."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!autoclicker§r - Enables/disables Anti Autoclicker."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!jesus§r - Enables/disables Anti Jesus (Walking on Water and Lava)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!phase§r - Enables/disables Anti Phase (Moving through blocks)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!enchantedarmor§r - Enables/disables Anti Enchanted Armor for all players."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!autoaura§r - Enables/disables Auto KillAura checks for all players."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!antikb§r - Enables/disables Anti Knockback for all players."}]}

# Gametest disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/removeCommandBlocks§r - Enables/disables Anti Command Blocks (Clears all when enabled)."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function overideCommandBlocksEnabled§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/nofrostwalker§r - Enables/disables Anti Frost Walker. High levels of Frost Walker can crash realms."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/worldborder§r - Enables/disables the world border and its size."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/phase§r - Enables/disables Anti Phase (Moving through blocks)."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function settings/enchantedArmor§r - Enables/disables Anti Enchanted Armor for all players."}]}

tellraw @s {"rawtext":[{"text":"\n§l§4Tools and Utilites"}]}

# Gametest enabled
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!auracheck <username>§r - Manual test for KillAura."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!ecwipe <username>§r - Clears a players ender chest."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!fly <username>§r - Enables/disables fly mode in survival."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!freeze <username>§r - Freeze a player and make it so they cant move."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!stats <username>§r - View a specific players anticheat logs."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!fullreport§r - View everyones anticheat logs."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!vanish§r - Enables/disables vanish (Used for spying on suspects)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!tag <tag>§r - Adds tag to username in chat window."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!clearchat§r - Clears chat."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!invsee <username>§r - Lists all the items in the usernames inventory."}]}

# Gametest disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ function tools/auracheck§r - Manual test for killaura."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ function tools/ecwipe§r - Clears a players ender chest."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ tools/fly§r - Enables/disables fly mode in survival."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ tools/stats§r - View a specific players anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute @a ~~~ function tools/stats§r - View everyones anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function tools/clearchat§r - Clears chat."}]}

tellraw @s {"rawtext":[{"text":"\n"}]}
