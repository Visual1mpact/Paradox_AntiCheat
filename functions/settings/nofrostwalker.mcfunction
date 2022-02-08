# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle No Frost Walker without perms!"}]}

# allow
execute @s[type=player,tag=op,scores={frostwalker=..0}] ~~~ scoreboard players set paradox:config frostwalker 1
execute @s[type=player,tag=op,scores={frostwalker=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6No Frost Walker!"}]}

# deny
execute @s[type=player,tag=op,scores={frostwalker=1..}] ~~~ scoreboard players set paradox:config frostwalker 0
execute @s[type=player,tag=op,scores={frostwalker=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4No Frost Walker!"}]}

scoreboard players operation @a frostwalker = paradox:config frostwalker

# If disabling Frostwalker then unlock items
execute @e[type=player,scores={frostwalker=..0}] ~~~ function checks/optional/frostwalkerNBT