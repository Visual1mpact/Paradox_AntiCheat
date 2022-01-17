# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has tried to toggle anti-jesus without perms!"}]}

# deny
execute @s[type=player,tag=op,scores={jesus=..0}] ~~~ scoreboard players set paradox:config jesus 1
execute @s[type=player,tag=op,scores={jesus=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has disabled §4Anti-jesus!"}]}

# allow
execute @s[type=player,tag=op,scores={jesus=1..}] ~~~ scoreboard players set paradox:config jesus 0
execute @s[type=player,tag=op,scores={jesus=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§6[§aParadox§6]§r "},{"selector":"@s"},{"text":" has enabled §aAnti-jesus!"}]}

scoreboard players operation @a jesus = paradox:config jesus
