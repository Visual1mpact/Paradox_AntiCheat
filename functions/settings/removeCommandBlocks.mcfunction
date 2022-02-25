# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Anti Command Blocks without perms!"}]}

# allow
execute @s[type=player,tag=paradoxOpped,scores={commandblocks=..0}] ~~~ scoreboard players set paradox:config commandblocks 1
execute @s[type=player,tag=paradoxOpped,scores={commandblocks=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Command Blocks!"}]}

# deny
execute @s[type=player,tag=paradoxOpped,scores={commandblocks=1..}] ~~~ scoreboard players set paradox:config commandblocks 0
execute @s[type=player,tag=paradoxOpped,scores={commandblocks=1..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Command Blocks!"}]}

scoreboard players operation @a commandblocks = paradox:config commandblocks