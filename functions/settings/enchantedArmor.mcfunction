# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Anti Enchanted Armor without perms!"}]}

# deny
execute @s[type=player,tag=paradoxOpped,scores={encharmor=..0}] ~~~ scoreboard players set paradox:config encharmor 1
execute @s[type=player,tag=paradoxOpped,scores={encharmor=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Enchanted Armor!"}]}

# allow
execute @s[type=player,tag=paradoxOpped,scores={encharmor=1..}] ~~~ scoreboard players set paradox:config encharmor 0
execute @s[type=player,tag=paradoxOpped,scores={encharmor=1..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Enchanted Armor!"}]}

scoreboard players operation @a encharmor = paradox:config encharmor
