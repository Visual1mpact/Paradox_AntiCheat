# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Gamemode 1 (Creative) without perms!"}]}

# allow
execute @s[type=player,tag=paradoxOpped,scores={gmc=..0}] ~~~ scoreboard players set paradox:config gmc 1
execute @s[type=player,tag=paradoxOpped,scores={gmc=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 1 (Creative)§r to be used!"}]}

# deny
execute @s[type=player,tag=paradoxOpped,scores={gmc=1..}] ~~~ scoreboard players set paradox:config gmc 0
execute @s[type=player,tag=paradoxOpped,scores={gmc=1..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 1 (Creative)§r to be used!"}]}

scoreboard players operation @a gmc = paradox:config gmc