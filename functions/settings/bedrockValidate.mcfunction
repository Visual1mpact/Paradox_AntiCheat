# make sure they are allowed to use this command
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §4§lHey! §rYou must be Paradox-Opped to use this function!"}]}
execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has tried to toggle BedrockValidate without perms!"}]}

# allow
execute @s[type=player,tag=op,scores={bedrock=..0}] ~~~ scoreboard players set paradox:config bedrock 1
execute @s[type=player,tag=op,scores={bedrock=..0}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6BedrockValidate!"}]}

# deny
execute @s[type=player,tag=op,scores={bedrock=1..}] ~~~ scoreboard players set paradox:config bedrock 0
execute @s[type=player,tag=op,scores={bedrock=1..}] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4BedrockValidate!"}]}

scoreboard players operation @a bedrock = paradox:config bedrock
