# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Gamemode 2 (Adventure) without perms!"}]}

# allow
execute @s[type=player,tag=op,scores={gma=..0}] ~~~ scoreboard players set paradox:config gma 1
execute @s[type=player,tag=op,scores={gma=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 2 (Adventure)§r to be used!"}]}

# deny
execute @s[type=player,tag=op,scores={gma=1..}] ~~~ scoreboard players set paradox:config gma 0
execute @s[type=player,tag=op,scores={gma=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 2 (Adventure)§r to be used!"}]}

scoreboard players operation @a gma = paradox:config gma
