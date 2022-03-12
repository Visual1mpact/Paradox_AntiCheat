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
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!bedrockvalidate§r - Checks validation of bedrock."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!overridecbe§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!nofrostwalker§r - Enables/disables Anti Frostwalker. High levels of Frostwalker can crash realms."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!worldborder <option>§r - Sets the World Border. Option: [1k, 5k, 10k, 25k, 50k, 100k, disable]"}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!autoclicker§r - Enables/disables Anti Autoclicker."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!jesusa§r - Checks if player's are walking on water and lava)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!phase§r - Enables/disables Anti Phase (Moving through blocks)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!enchantedarmor§r - Enables/disables Anti Enchanted Armor for all players."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!autoaura§r - Enables/disables Auto KillAura checks for all players."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!antikb§r - Enables/disables Anti Knockback for all players."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!badpackets2§r - Checks message length for each broadcast."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!spammera§r - Checks if message is sent while moving."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!spammerb§r - Checks if message is sent while swinging."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!spammerc§r - Checks if message is sent while using items."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!spammerd§r - Checks if message is sent while GUI is open."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!antispam§r - Checks for spamming in chat with 2 second cooldown."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!crashera§r - Prevents Horion crasher."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!namespoofa§r - Checks if player's name exceeds character limitations."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!namespoofb§r - Checks if player's name has Non ASCII characters."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!reacha§r - Checks if player's place blocks beyond reach."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!reachb§r - Checks if player's break blocks beyond reach."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!noslowa§r - Checks if player's are speed hacking."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!flya§r - Checks if player's are flying in survival."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!illegalitemsa§r - Checks if player's have illegal items in inventory."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!illegalitemsb§r - Checks if player's use illegal items."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!illegalitemsc§r - Checks if player's place illegal items."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!antiscaffolda§r - Checks player's for illegal scaffolding."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!antinukera§r - Checks player's for nuking blocks."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!xraya§r - Notify's staff when and where player's mine specific ores."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!banwindow§r - Disables server ban to allow banned players to join (Does not include global ban)."}]}


tellraw @s {"rawtext":[{"text":"\n§l§4Tools and Utilites"}]}

# Gametest enabled
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!auracheck <username>§r - Manual test for KillAura."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!ecwipe <username>§r - Clears a players ender chest."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!fly <username>§r - Enables/disables fly mode in survival."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!freeze <username>§r - Freeze a player and make it so they cant move."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!stats <username>§r - View a specific players anticheat logs."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!fullreport§r - View everyones anticheat logs."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!vanish§r - Enables/disables vanish (Used for spying on suspects)."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!tag <username> Rank:rank§r - Add tags to username in chat window."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!tag <username> reset§r - Remove tags to username in chat window."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!clearchat§r - Clears chat."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"§6!invsee <username>§r - Lists all the items in the usernames inventory."}]}

# Gametest disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ tools/stats§r - View a specific players anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute @a ~~~ function tools/stats§r - View everyones anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function tools/clearchat§r - Clears chat."}]}

tellraw @s {"rawtext":[{"text":"\n"}]}
