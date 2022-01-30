# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Autoaura without perms!"}]}

# deny
execute @s[type=player,tag=op,scores={autoaura=..0}] ~~~ scoreboard players set paradox:config autoaura 1
execute @s[type=player,tag=op,scores={autoaura=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Autoaura!"}]}

# allow
execute @s[type=player,tag=op,scores={autoaura=1..}] ~~~ scoreboard players set paradox:config autoaura 0
execute @s[type=player,tag=op,scores={autoaura=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Autoaura!"}]}

scoreboard players operation @a autoaura = paradox:config autoaura
