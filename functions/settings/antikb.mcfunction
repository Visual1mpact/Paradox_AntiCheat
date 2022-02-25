# make sure they are allowed to use this command
tellraw @s[type=player,tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!paradoxOpped] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle Anti Knockback without perms!"}]}

# deny
execute @s[type=player,tag=paradoxOpped,scores={antikb=..0}] ~~~ scoreboard players set paradox:config antikb 1
execute @s[type=player,tag=paradoxOpped,scores={antikb=..0}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Knockback!"}]}

# allow
execute @s[type=player,tag=paradoxOpped,scores={antikb=1..}] ~~~ scoreboard players set paradox:config antikb 0
execute @s[type=player,tag=paradoxOpped,scores={antikb=1..}] ~~~ tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Knockback!"}]}

scoreboard players operation @a antikb = paradox:config antikb
