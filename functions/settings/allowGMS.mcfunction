# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has tried to toggle Gamemode 0 without perms!"}]}

# allow
execute @s[type=player,tag=op,scores={gms=..0}] ~~~ scoreboard players set paradox:config gms 1
execute @s[type=player,tag=op,scores={gms=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has disallowed §4gamemode 0§r to be used!"}]}

# deny
execute @s[type=player,tag=op,scores={gms=1..}] ~~~ scoreboard players set paradox:config gms 0
execute @s[type=player,tag=op,scores={gms=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has allowed §agamemode 0§r to be used!"}]}

scoreboard players operation @a gms = paradox:config gms