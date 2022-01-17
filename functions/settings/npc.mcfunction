# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle NPCs without perms!"}]}

# deny
execute @s[type=player,tag=op,scores={npc=..0}] ~~~ scoreboard players set paradox:config npc 1
execute @s[type=player,tag=op,scores={npc=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti-NPC!"}]}

# allow
execute @s[type=player,tag=op,scores={npc=1..}] ~~~ scoreboard players set paradox:config npc 0
execute @s[type=player,tag=op,scores={npc=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti-NPC!"}]}

scoreboard players operation @a npc = paradox:config npc
