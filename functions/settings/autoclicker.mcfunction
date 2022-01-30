# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle anti-autoclicker without perms!"}]}

# deny
execute @s[type=player,tag=op,scores={autoclicker=..0}] ~~~ scoreboard players set paradox:config autoclicker 1
execute @s[type=player,tag=op,scores={autoclicker=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §4Anti-autoclicker!"}]}

# allow
execute @s[type=player,tag=op,scores={autoclicker=1..}] ~~~ scoreboard players set paradox:config autoclicker 0
execute @s[type=player,tag=op,scores={autoclicker=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §6Anti-autoclicker!"}]}

scoreboard players operation @a autoclicker = paradox:config autoclicker
