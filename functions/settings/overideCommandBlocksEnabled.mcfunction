# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Force-CommandBlocksEnabled without perms!"}]}

# enable
execute @s[type=player,tag=op,scores={cmds=..0}] ~~~ scoreboard players set paradox:config cmds 1
execute @s[type=player,tag=op,scores={cmds=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set CommandBlocksEnabled §6as enabled!"}]}

# disable command blocks
execute @s[type=player,tag=op,scores={cmds=1}] ~~~ scoreboard players set paradox:config cmds 2
execute @s[type=player,tag=op,scores={cmds=1}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set CommandBlocksEnabled §4as disabled!"}]}

# allow command block
execute @s[type=player,tag=op,scores={cmds=2..}] ~~~ scoreboard players set paradox:config cmds 0
execute @s[type=player,tag=op,scores={cmds=2..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has §etoggled§r Force-CommandBlocksEnabled!"}]}

scoreboard players operation @a cmds = paradox:config cmds