# survival mode check
scoreboard players add @s[tag=!paradoxOpped,m=s,scores={gms=1..}] gamemodevl 1
execute @s[tag=!paradoxOpped,m=s,scores={gms=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has tried to change their gamemode §7(Gamemode_S)§6.§4 VL= "},{"score":{"name":"@s","objective":"gamemodevl"}}]}
gamemode 2 @s[tag=!paradoxOpped,m=s,scores={gma=..0,gms=1..}]
gamemode 1 @s[tag=!paradoxOpped,m=s,scores={gmc=..0,gms=1..}]

# if all gamemodes are disabled, allow adventure mode to be used
execute @s[scores={gma=1..,gms=1..,gmc=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, adventure mode has been enabled."}]}
execute @s[scores={gma=1..,gms=1..,gmc=1..}] ~~~ scoreboard players set * gma 1
