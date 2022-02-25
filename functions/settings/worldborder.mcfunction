# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §has tried to toggle World Border without perms!"}]}

# 1k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=..0}] ~~~ scoreboard players set paradox:config worldborder 1
execute @s[type=player,tag=paradoxOpped,scores={worldborder=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 1k!"}]}

# 5k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=1}] ~~~ scoreboard players set paradox:config worldborder 2
execute @s[type=player,tag=paradoxOpped,scores={worldborder=1}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 5k!"}]}

# 10k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=2}] ~~~ scoreboard players set paradox:config worldborder 3
execute @s[type=player,tag=paradoxOpped,scores={worldborder=2}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 10k!"}]}

# 25k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=3}] ~~~ scoreboard players set paradox:config worldborder 4
execute @s[type=player,tag=paradoxOpped,scores={worldborder=3}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 25k!"}]}

# 50k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=4}] ~~~ scoreboard players set paradox:config worldborder 5
execute @s[type=player,tag=paradoxOpped,scores={worldborder=4}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 50k!"}]}

# 100k
execute @s[type=player,tag=paradoxOpped,scores={worldborder=5}] ~~~ scoreboard players set paradox:config worldborder 6
execute @s[type=player,tag=paradoxOpped,scores={worldborder=5}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 100k!"}]}

# disable
execute @s[type=player,tag=paradoxOpped,scores={worldborder=6..}] ~~~ scoreboard players set paradox:config worldborder 0
execute @s[type=player,tag=paradoxOpped,scores={worldborder=6..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has §4disabled§r World Border!"}]}

scoreboard players operation @a worldborder = paradox:config worldborder