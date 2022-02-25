# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Anti Autoclicker without perms!"}]}

# deny
execute @s[type=player,tag=paradoxOpped,scores={autoclicker=..0}] ~~~ scoreboard players set paradox:config autoclicker 1
execute @s[type=player,tag=paradoxOpped,scores={autoclicker=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Autoclicker!"}]}

# allow
execute @s[type=player,tag=paradoxOpped,scores={autoclicker=1..}] ~~~ scoreboard players set paradox:config autoclicker 0
execute @s[type=player,tag=paradoxOpped,scores={autoclicker=1..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Autoclicker!"}]}

scoreboard players operation @a autoclicker = paradox:config autoclicker
