tellraw @s {"rawtext":[{"text":"\n§l§6[§4Paradox AntiCheat Command Help§6]§r"}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"\n§l§4Gametest Is Enabled In World!"}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"\n§l§4Please use the command !help."}]}
tellraw @s[scores={gametestapi=1..}] {"rawtext":[{"text":"\n§l§4All commands will use prefix commands!"}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§4Gametest Is Disabled In World!"}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§4Please Enable Gametest, Cheats, and Education Edition!"}]}

tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§6[§4Moderation Commands§6]§r"}]}

# Gametest Disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function help§r - Shows this help page."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ op§r - Op's player in Paradox AntiCheat features."}]}

tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"\n§l§6[§4Tools and Utilites§6]§r"}]}

# Gametest disabled
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute <username> ~~~ tools/stats§r - View a specific players anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/execute @a ~~~ function tools/stats§r - View everyones anticheat logs."}]}
tellraw @s[scores={gametestapi=..0}] {"rawtext":[{"text":"§6/function tools/clearchat§r - Clears chat."}]}

tellraw @s {"rawtext":[{"text":"\n"}]}
